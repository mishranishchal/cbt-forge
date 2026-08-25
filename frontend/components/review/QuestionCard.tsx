"use client";

import { useState } from "react";
import { deleteQuestion, imageUrl, updateQuestion } from "@/lib/api";
import type { Question } from "@/lib/types";
import { QuestionEditor } from "./QuestionEditor";

export function QuestionCard({
  question,
  onSaved,
  onDeleted
}: {
  question: Question;
  onSaved: (question: Question) => void;
  onDeleted: (questionId: string) => void;
}) {
  const [draft, setDraft] = useState<Question>(question);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const saved = await updateQuestion(draft);
      setDraft(saved);
      onSaved(saved);
      setMessage("Saved");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    await deleteQuestion(question.id);
    onDeleted(question.id);
  }

  const statusClass = draft.validation_status === "valid" ? "text-green-700 bg-green-50 border-green-200" : draft.validation_status === "error" ? "text-red-700 bg-red-50 border-red-200" : "text-amber-700 bg-amber-50 border-amber-200";

  return (
    <article className="rounded-lg border border-line bg-white p-5 shadow-panel">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">Question {draft.question_number ?? "Unnumbered"}</h2>
          <div className="mt-1 text-sm text-steel">Confidence {(draft.confidence * 100).toFixed(0)}% {draft.source_page ? `- Page ${draft.source_page}` : ""}</div>
        </div>
        <span className={`rounded-md border px-3 py-1 text-xs font-semibold uppercase ${statusClass}`}>{draft.validation_status}</span>
      </div>

      {draft.question_images.length > 0 ? (
        <div className="mb-4 grid gap-3 md:grid-cols-2">
          {draft.question_images.map((image) => (
            <img key={image.path} className="max-h-72 w-full rounded-md border border-line object-contain" src={imageUrl(image.path)} alt="Question source visual" />
          ))}
        </div>
      ) : null}

      <QuestionEditor question={draft} testId={question.id.split("_")[0] || "manual"} onChange={setDraft} />

      {draft.warnings.length > 0 ? (
        <ul className="mt-4 space-y-1 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {draft.warnings.map((warning) => <li key={warning}>{warning}</li>)}
        </ul>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button className="rounded-md bg-forge px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={saving} onClick={save}>Save</button>
        <button className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-ink" disabled={saving} onClick={remove}>Delete</button>
        <button className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-steel" disabled={saving} onClick={() => setDraft(question)}>Reset</button>
        {message ? <span className="py-2 text-sm text-steel">{message}</span> : null}
      </div>
    </article>
  );
}
