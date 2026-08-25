"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { Loading } from "@/components/common/Loading";
import { QuestionCard } from "@/components/review/QuestionCard";
import { ReviewToolbar, type ReviewFilter } from "@/components/review/ReviewToolbar";
import { getQuestions } from "@/lib/api";
import type { Question } from "@/lib/types";

export default function ReviewPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f7f8fb] px-5 py-6"><Loading label="Loading review" /></main>}>
      <ReviewContent />
    </Suspense>
  );
}

function ReviewContent() {
  const searchParams = useSearchParams();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const testId = searchParams.get("testId") ?? (typeof window !== "undefined" ? localStorage.getItem("cbt-forge-test-id") : null);

  useEffect(() => {
    async function load() {
      if (!testId) {
        setError("No extracted test is selected. Create or load a demo first.");
        setLoading(false);
        return;
      }
      try {
        setQuestions(await getQuestions(testId));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load questions.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [testId]);

  const visibleQuestions = useMemo(() => {
    return questions.filter((question) => {
      if (filter === "all") return true;
      if (filter === "image") return question.question_type === "image_based" || question.question_images.length > 0;
      if (filter === "unanswered") return !question.correct_answer?.length;
      return question.validation_status === filter;
    });
  }, [questions, filter]);

  return (
    <main className="min-h-screen bg-[#f7f8fb] px-5 py-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div>
            <div className="text-xl font-semibold text-ink">Review Questions</div>
            <div className="text-sm text-steel">{testId ? `Test ${testId}` : "No test selected"}</div>
          </div>
          <Link href="/upload" className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink">Start Over</Link>
        </header>

        {error ? <ErrorMessage message={error} /> : null}
        {loading ? <Loading label="Loading questions" /> : null}
        {!loading && !error ? (
          <div className="space-y-5">
            <ReviewToolbar questions={questions} filter={filter} onFilterChange={setFilter} />
            {visibleQuestions.map((question) => (
              <QuestionCard
                key={question.id}
                question={question}
                onSaved={(saved) => setQuestions((current) => current.map((item) => (item.id === saved.id ? saved : item)))}
                onDeleted={(questionId) => setQuestions((current) => current.filter((item) => item.id !== questionId))}
              />
            ))}
            {visibleQuestions.length === 0 ? <div className="rounded-md border border-line bg-white p-6 text-sm text-steel">No questions match this filter.</div> : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}
