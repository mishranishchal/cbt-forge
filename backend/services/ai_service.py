import asyncio
import json
import os
from abc import ABC, abstractmethod
from typing import Any

import httpx

from schemas.question import Question


AI_BUSY_MESSAGE = "AI service is temporarily busy. Please try again."
AI_DISABLED_MESSAGE = "AI assistance is currently disabled."


class AIServiceError(RuntimeError):
    pass


class AIProvider(ABC):
    @abstractmethod
    async def extract_questions(self, text_chunks: list[str], images: list[dict[str, Any]] | None = None) -> list[Question]:
        raise NotImplementedError


SYSTEM_PROMPT = """You are an expert question-paper extraction engine.
Your job is to extract existing questions from supplied text and images.
Do not create new questions. Do not invent answers. Do not invent explanations.
Preserve the original wording as accurately as possible. Preserve option order.
Detect question numbers, sections, topics, and source pages when reasonably identifiable.
If information is unavailable, return null. If the correct answer is uncertain, return null.
If an image is required to understand the question, mark the question as image_based.
Return structured JSON only as {"questions": [...]}."""


class OpenRouterProvider(AIProvider):
    def __init__(self) -> None:
        self.ai_enabled = os.getenv("AI_ENABLED", "false").strip().lower() in {"1", "true", "yes", "on"}
        self.api_key = os.getenv("OPENROUTER_API_KEY", "")
        self.model = os.getenv("OPENROUTER_MODEL", "openrouter/free")
        self.site_url = os.getenv("OPENROUTER_SITE_URL", "http://localhost:3000")
        self.site_name = os.getenv("OPENROUTER_SITE_NAME", "CBT Forge")
        self.endpoint = "https://openrouter.ai/api/v1/chat/completions"

    def _ensure_enabled(self) -> None:
        if not self.ai_enabled:
            raise AIServiceError(AI_DISABLED_MESSAGE)

    async def extract_questions(self, text_chunks: list[str], images: list[dict[str, Any]] | None = None) -> list[Question]:
        self._ensure_enabled()
        if not self.api_key:
            raise AIServiceError("OPENROUTER_API_KEY is not configured.")
        questions: list[Question] = []
        for chunk_index, chunk in enumerate(text_chunks, start=1):
            payload = self._payload(chunk, images or [], chunk_index)
            raw = await self._post_with_retries(payload)
            questions.extend(self._parse_questions(raw))
        return questions

    async def classify_metadata(self, questions: list[dict[str, Any]]) -> list[dict[str, Any]]:
        self._ensure_enabled()
        if not self.api_key:
            raise AIServiceError("OPENROUTER_API_KEY is not configured.")
        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You classify existing exam questions. Return JSON only as "
                        '{"items":[{"id":"...","section":null,"topic":null,"subtopic":null,"difficulty":"unknown"}]}. '
                        "Do not rewrite question text, options, answers, or explanations."
                    ),
                },
                {
                    "role": "user",
                    "content": json.dumps({"questions": questions}, ensure_ascii=False),
                },
            ],
            "temperature": 0,
            "response_format": {"type": "json_object"},
        }
        raw = await self._post_with_retries(payload)
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise AIServiceError("AI returned malformed metadata JSON.") from exc
        items = parsed.get("items", [])
        return items if isinstance(items, list) else []

    def _payload(self, text: str, images: list[dict[str, Any]], chunk_index: int) -> dict[str, Any]:
        user_content = (
            f"Extract questions from chunk {chunk_index}. Include question_number, question_text, options, correct_answer, "
            f"explanation, section, topic, subtopic, difficulty, source_page, confidence, warnings.\n\n{text}"
        )
        return {
            "model": self.model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            "temperature": 0,
            "response_format": {"type": "json_object"},
        }

    async def _post_with_retries(self, payload: dict[str, Any]) -> str:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": self.site_url,
            "X-Title": self.site_name,
        }
        transient = {429, 500, 502, 503}
        last_error: Exception | None = None
        async with httpx.AsyncClient(timeout=45) as client:
            for attempt in range(3):
                try:
                    response = await client.post(self.endpoint, headers=headers, json=payload)
                    if response.status_code in transient:
                        await asyncio.sleep(2**attempt)
                        continue
                    response.raise_for_status()
                    body = response.json()
                    return body["choices"][0]["message"]["content"]
                except (httpx.TimeoutException, httpx.NetworkError, httpx.HTTPStatusError, KeyError, IndexError, json.JSONDecodeError) as exc:
                    last_error = exc
                    await asyncio.sleep(2**attempt)
        raise AIServiceError(AI_BUSY_MESSAGE) from last_error

    def _parse_questions(self, raw: str) -> list[Question]:
        try:
            payload = json.loads(raw)
            items = payload.get("questions", payload if isinstance(payload, list) else [])
            return [Question.model_validate(self._with_defaults(item, index)) for index, item in enumerate(items, start=1)]
        except Exception as first_error:
            repaired = self._local_json_repair(raw)
            if repaired is not None:
                try:
                    items = repaired.get("questions", repaired if isinstance(repaired, list) else [])
                    return [Question.model_validate(self._with_defaults(item, index)) for index, item in enumerate(items, start=1)]
                except Exception:
                    pass
            raise AIServiceError("AI returned malformed question JSON.") from first_error

    def _local_json_repair(self, raw: str) -> Any | None:
        start = raw.find("{")
        end = raw.rfind("}")
        if start >= 0 and end > start:
            try:
                return json.loads(raw[start : end + 1])
            except json.JSONDecodeError:
                return None
        return None

    def _with_defaults(self, item: dict[str, Any], index: int) -> dict[str, Any]:
        data = dict(item)
        data.setdefault("id", f"q{index:03d}")
        data.setdefault("question_text", "")
        data.setdefault("images", [])
        data.setdefault("options", [])
        data.setdefault("difficulty", "unknown")
        data.setdefault("confidence", 0.5)
        data.setdefault("validation_status", "warning")
        data.setdefault("warnings", [])
        return data

    async def generate_performance_review(self, statistics: dict[str, Any]) -> dict[str, Any]:
        self._ensure_enabled()
        if not self.api_key:
            raise AIServiceError("OPENROUTER_API_KEY is not configured.")
        system = (
            "You write exam performance reviews from supplied statistics only. "
            "Do not invent facts about the candidate. Do not invent or modify scores. "
            "Do not change supplied statistics. If data is insufficient, say so. "
            "Return JSON only with keys: overall_assessment, strongest_areas, weakest_areas, "
            "revision_priorities, exam_strategy."
        )
        raw = await self._post_with_retries(
            {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": json.dumps({"statistics": statistics}, ensure_ascii=False)},
                ],
                "temperature": 0,
                "response_format": {"type": "json_object"},
            }
        )
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError as exc:
            repaired = self._local_json_repair(raw)
            if not isinstance(repaired, dict):
                raise AIServiceError("AI returned malformed analysis JSON.") from exc
            parsed = repaired
        return {
            "overall_assessment": parsed.get("overall_assessment") or "Insufficient data to produce a review.",
            "strongest_areas": parsed.get("strongest_areas") or [],
            "weakest_areas": parsed.get("weakest_areas") or [],
            "revision_priorities": parsed.get("revision_priorities") or [],
            "exam_strategy": parsed.get("exam_strategy") or [],
            "source": "ai",
        }

    async def generate_explanation(self, question: dict[str, Any]) -> dict[str, Any]:
        self._ensure_enabled()
        if not self.api_key:
            raise AIServiceError("OPENROUTER_API_KEY is not configured.")
        system = (
            "Explain the given exam question. Use only the supplied question, options, and correct answer. "
            "Do not invent a different correct answer. Return JSON with keys: concept, steps, final_answer."
        )
        payload = {
            "question_text": question.get("question_text"),
            "options": question.get("options"),
            "correct_answer": question.get("correct_answer"),
            "has_image": bool(question.get("images")),
        }
        raw = await self._post_with_retries(
            {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
                ],
                "temperature": 0,
                "response_format": {"type": "json_object"},
            }
        )
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError as exc:
            repaired = self._local_json_repair(raw)
            if not isinstance(repaired, dict):
                raise AIServiceError("AI returned malformed explanation JSON.") from exc
            parsed = repaired
        return {
            "concept": parsed.get("concept") or "",
            "steps": parsed.get("steps") or parsed.get("step_by_step") or "",
            "final_answer": parsed.get("final_answer") or "",
            "ai_generated": True,
        }
