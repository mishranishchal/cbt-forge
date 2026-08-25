import pytest

from services.ai_service import AIServiceError, OpenRouterProvider


def test_malformed_ai_json_raises() -> None:
    provider = OpenRouterProvider()
    with pytest.raises(AIServiceError):
        provider._parse_questions("not json")


def test_ai_json_repair_from_wrapped_response() -> None:
    provider = OpenRouterProvider()
    raw = 'Here is JSON: {"questions":[{"id":"q001","question_number":1,"question_text":"A?","options":[],"confidence":0.4}]}'
    questions = provider._parse_questions(raw)
    assert questions[0].question_text == "A?"


@pytest.mark.asyncio
async def test_openrouter_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AI_ENABLED", "true")
    provider = OpenRouterProvider()
    monkeypatch.setattr(provider, "api_key", "test-key")

    async def fail(_: dict) -> str:
        raise AIServiceError("AI service is temporarily busy. Please try again.")

    monkeypatch.setattr(provider, "_post_with_retries", fail)
    with pytest.raises(AIServiceError):
        await provider.extract_questions(["Q1. Test?"])


@pytest.mark.asyncio
async def test_429_response_is_reported(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AI_ENABLED", "true")
    provider = OpenRouterProvider()
    monkeypatch.setattr(provider, "api_key", "test-key")

    async def busy(_: dict) -> str:
        raise AIServiceError("AI service is temporarily busy. Please try again.")

    monkeypatch.setattr(provider, "_post_with_retries", busy)
    with pytest.raises(AIServiceError, match="temporarily busy"):
        await provider.extract_questions(["Q1. Test?"])
