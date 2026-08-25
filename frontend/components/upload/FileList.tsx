"use client";

import type { FileRole } from "@/lib/types";

const roleOptions: { label: string; value: FileRole }[] = [
  { label: "Question Paper", value: "question_paper" },
  { label: "Answer Key", value: "answer_key" },
  { label: "Explanation", value: "explanation" },
  { label: "Other", value: "other" }
];

export function FileList({
  files,
  roles,
  onRoleChange,
  onRemove
}: {
  files: File[];
  roles: FileRole[];
  onRoleChange: (index: number, role: FileRole) => void;
  onRemove: (index: number) => void;
}) {
  if (files.length === 0) {
    return <div className="rounded-md border border-dashed border-line bg-[#fafbfc] px-4 py-6 text-sm text-steel">No files selected.</div>;
  }
  return (
    <div className="space-y-3">
      {files.map((file, index) => (
        <div key={`${file.name}-${index}`} className="grid gap-3 rounded-md border border-line bg-white p-3 md:grid-cols-[1fr_190px_auto] md:items-center">
          <div>
            <div className="font-medium text-ink">{file.name}</div>
            <div className="text-xs text-steel">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
          </div>
          <select
            className="focus-ring rounded-md border border-line bg-white px-3 py-2 text-sm"
            value={roles[index] ?? "other"}
            onChange={(event) => onRoleChange(index, event.target.value as FileRole)}
          >
            {roleOptions.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
          <button type="button" className="rounded-md border border-line px-3 py-2 text-sm font-medium text-steel hover:text-red-700" onClick={() => onRemove(index)}>
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
