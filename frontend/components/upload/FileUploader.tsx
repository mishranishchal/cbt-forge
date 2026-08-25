"use client";

import { useRef } from "react";
import type { FileRole } from "@/lib/types";
import { FileList } from "./FileList";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

export function FileUploader({
  files,
  roles,
  onChange,
  onError
}: {
  files: File[];
  roles: FileRole[];
  onChange: (files: File[], roles: FileRole[]) => void;
  onError: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  function addFiles(selected: FileList | null) {
    if (!selected) return;
    const incoming = Array.from(selected);
    const invalid = incoming.find((file) => !/\.(pdf|txt|json|png|jpe?g|webp)$/i.test(file.name));
    if (invalid) {
      onError("Supported formats: PDF, TXT, JSON, PNG, JPG, JPEG, WEBP.");
      return;
    }
    const tooLarge = incoming.find((file) => file.size > MAX_FILE_SIZE);
    if (tooLarge) {
      onError("Uploaded file is too large for development mode.");
      return;
    }
    onError("");
    onChange([...files, ...incoming], [...roles, ...incoming.map(() => "question_paper" as FileRole)]);
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        className="w-full rounded-md border border-dashed border-forge bg-white px-5 py-8 text-center text-sm font-semibold text-forge hover:bg-[#f0f7f8]"
        onClick={() => inputRef.current?.click()}
      >
        Select PDF, TXT, JSON, or image files
      </button>
      <input ref={inputRef} className="hidden" type="file" accept=".pdf,.txt,.json,.png,.jpg,.jpeg,.webp,application/pdf,text/plain,application/json,image/png,image/jpeg,image/webp" multiple onChange={(event) => addFiles(event.target.files)} />
      <FileList
        files={files}
        roles={roles}
        onRoleChange={(index, role) => {
          const next = [...roles];
          next[index] = role;
          onChange(files, next);
        }}
        onRemove={(index) => {
          onChange(
            files.filter((_, itemIndex) => itemIndex !== index),
            roles.filter((_, itemIndex) => itemIndex !== index)
          );
        }}
      />
    </div>
  );
}
