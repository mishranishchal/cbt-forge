import type { Attempt, ConfigurationValidationResult, ExtractResponse, FileRole, HistoryItem, Question, ResultPayload, TestConfiguration } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
export { API_BASE };

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = "Request failed.";
    try {
      const body = await response.json();
      message = body.detail ?? message;
    } catch {
      message = response.statusText || message;
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export async function uploadInputs(payload: {
  files: File[];
  roles: FileRole[];
  questionText: string;
  answerKeyText: string;
  explanationText: string;
}): Promise<{ test_id: string }> {
  const form = new FormData();
  payload.files.forEach((file) => form.append("files", file));
  payload.roles.forEach((role) => form.append("roles", role));
  form.append("question_text", payload.questionText);
  form.append("answer_key_text", payload.answerKeyText);
  form.append("explanation_text", payload.explanationText);
  return parseResponse(await fetch(`${API_BASE}/api/upload`, { method: "POST", body: form }));
}

export async function extractQuestions(testId: string, useDemo = false): Promise<ExtractResponse> {
  return parseResponse(
    await fetch(`${API_BASE}/api/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ test_id: testId, use_demo: useDemo })
    })
  );
}

export async function getQuestions(testId: string): Promise<Question[]> {
  return parseResponse(await fetch(`${API_BASE}/api/tests/${testId}/questions`));
}

export async function createQuestion(testId: string, payload: Partial<Question> = {}): Promise<Question> {
  return parseResponse(await fetch(`${API_BASE}/api/tests/${testId}/questions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }));
}

export async function updateQuestion(question: Question): Promise<Question> {
  return parseResponse(
    await fetch(`${API_BASE}/api/questions/${question.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(question)
    })
  );
}

export async function deleteQuestion(questionId: string): Promise<void> {
  await parseResponse(await fetch(`${API_BASE}/api/questions/${questionId}`, { method: "DELETE" }));
}

export async function duplicateQuestion(questionId: string): Promise<Question> {
  return parseResponse(await fetch(`${API_BASE}/api/questions/${questionId}/duplicate`, { method: "POST" }));
}

export async function bulkUpdateQuestions(payload: { question_ids: string[]; section?: string; topic?: string; difficulty?: string }): Promise<Question[]> {
  return parseResponse(
    await fetch(`${API_BASE}/api/questions/bulk-update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
  );
}

export async function reorderQuestions(testId: string, questionIds: string[]): Promise<Question[]> {
  return parseResponse(
    await fetch(`${API_BASE}/api/questions/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ test_id: testId, question_ids: questionIds })
    })
  );
}

export async function organizeQuestions(testId: string): Promise<Question[]> {
  return parseResponse(await fetch(`${API_BASE}/api/tests/${testId}/organize`, { method: "POST" }));
}

export async function getConfiguration(testId: string): Promise<TestConfiguration> {
  return parseResponse(await fetch(`${API_BASE}/api/tests/${testId}/configuration`));
}

export async function saveConfiguration(testId: string, configuration: TestConfiguration): Promise<TestConfiguration> {
  return parseResponse(
    await fetch(`${API_BASE}/api/tests/${testId}/configuration`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(configuration)
    })
  );
}

export async function validateConfiguration(testId: string, configuration: TestConfiguration): Promise<ConfigurationValidationResult> {
  return parseResponse(
    await fetch(`${API_BASE}/api/tests/${testId}/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(configuration)
    })
  );
}

export function imageUrl(path: string): string {
  if (path.replace(/\\/g, "/").startsWith("uploads/")) return `${API_BASE}/${path.replace(/\\/g, "/")}`;
  const filename = path.split(/[\\/]/).pop();
  return filename ? `${API_BASE}/extracted_images/${filename}` : path;
}

export async function uploadImage(payload: { file: File; testId: string; questionId: string; scope: "question" | "explanation" | "options"; optionId?: string }): Promise<import("./types").QuestionImage> {
  const form = new FormData();
  form.append("file", payload.file);
  form.append("test_id", payload.testId);
  form.append("question_id", payload.questionId);
  form.append("scope", payload.scope);
  if (payload.optionId) form.append("option_id", payload.optionId);
  return parseResponse(await fetch(`${API_BASE}/api/images/upload`, { method: "POST", body: form }));
}

export async function createDemoTest(): Promise<{ test_id: string; route: string }> {
  return parseResponse(await fetch(`${API_BASE}/api/demo`, { method: "POST" }));
}

export async function listTests(): Promise<Array<{ test_id: string; title: string; status: string; has_questions: boolean; has_configuration: boolean; demo?: boolean }>> {
  return parseResponse(await fetch(`${API_BASE}/api/tests`));
}

export async function createAttempt(testId: string, resumeIfActive = true): Promise<Attempt> {
  return parseResponse(
    await fetch(`${API_BASE}/api/tests/${testId}/attempts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume_if_active: resumeIfActive })
    })
  );
}

export async function getAttempt(attemptId: string): Promise<Attempt> {
  return parseResponse(await fetch(`${API_BASE}/api/attempts/${attemptId}`));
}

export async function saveAttemptResponse(attemptId: string, questionId: string, payload: Record<string, unknown>) {
  return parseResponse(
    await fetch(`${API_BASE}/api/attempts/${attemptId}/responses/${questionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
  );
}

export async function recordAttemptEvent(attemptId: string, eventType: string, payload: Record<string, unknown> = {}) {
  return parseResponse(
    await fetch(`${API_BASE}/api/attempts/${attemptId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: eventType, payload })
    })
  );
}

export async function submitAttempt(attemptId: string, reason: "MANUAL" | "TIMEOUT" | "SECTION_TIMEOUT" | "SYSTEM" = "MANUAL", currentSection?: string | null, currentQuestion?: string | null): Promise<ResultPayload> {
  return parseResponse(
    await fetch(`${API_BASE}/api/attempts/${attemptId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, current_section: currentSection, current_question: currentQuestion })
    })
  );
}

export async function getResult(attemptId: string): Promise<ResultPayload> {
  return parseResponse(await fetch(`${API_BASE}/api/attempts/${attemptId}/result`));
}

export async function generateAiAnalysis(attemptId: string): Promise<Record<string, unknown>> {
  return parseResponse(await fetch(`${API_BASE}/api/attempts/${attemptId}/ai-analysis`, { method: "POST" }));
}

export async function generateExplanation(questionId: string): Promise<Record<string, unknown>> {
  return parseResponse(await fetch(`${API_BASE}/api/questions/${questionId}/generate-explanation`, { method: "POST" }));
}

export async function getHistory(): Promise<HistoryItem[]> {
  return parseResponse(await fetch(`${API_BASE}/api/history`));
}

export async function retakeAttempt(attemptId: string): Promise<Attempt> {
  return parseResponse(await fetch(`${API_BASE}/api/attempts/${attemptId}/retake`, { method: "POST" }));
}

export async function deleteAttempt(attemptId: string): Promise<void> {
  await parseResponse(await fetch(`${API_BASE}/api/attempts/${attemptId}`, { method: "DELETE" }));
}

export function exportUrl(attemptId: string, format: "json" | "html" | "pdf") {
  return `${API_BASE}/api/attempts/${attemptId}/export/${format}`;
}
