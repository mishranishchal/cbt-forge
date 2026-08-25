"use client";

import type { Question } from "@/lib/types";

export type ReviewFilter = "all" | "valid" | "warning" | "error" | "image" | "unanswered";

const filters: { label: string; value: ReviewFilter }[] = [
  { label: "All", value: "all" },
  { label: "Valid", value: "valid" },
  { label: "Warnings", value: "warning" },
  { label: "Errors", value: "error" },
  { label: "Image Questions", value: "image" },
  { label: "Unanswered", value: "unanswered" }
];

export function ReviewToolbar({
  questions,
  filter,
  onFilterChange
}: {
  questions: Question[];
  filter: ReviewFilter;
  onFilterChange: (filter: ReviewFilter) => void;
}) {
  const counts = {
    all: questions.length,
    valid: questions.filter((question) => question.validation_status === "valid").length,
    warning: questions.filter((question) => question.validation_status === "warning").length,
    error: questions.filter((question) => question.validation_status === "error").length,
    image: questions.filter((question) => question.question_type === "image_based" || question.question_images.length > 0).length,
    unanswered: questions.filter((question) => !question.correct_answer?.length).length
  };

  return (
    <div className="rounded-lg border border-line bg-white p-3 shadow-panel">
      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.value}
            className={`rounded-md border px-3 py-2 text-sm font-medium ${
              filter === item.value ? "border-forge bg-[#eef7f8] text-forge" : "border-line bg-white text-steel hover:text-ink"
            }`}
            onClick={() => onFilterChange(item.value)}
          >
            {item.label} <span className="ml-1 text-xs">{counts[item.value]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
