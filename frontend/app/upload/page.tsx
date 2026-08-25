"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { Loading } from "@/components/common/Loading";
import { FileUploader } from "@/components/upload/FileUploader";
import { extractQuestions, uploadInputs } from "@/lib/api";
import type { ExtractionSummary, FileRole } from "@/lib/types";

export default function UploadPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f7f8fb] px-5 py-6"><Loading label="Loading upload" /></main>}>
      <UploadContent />
    </Suspense>
  );
}

function UploadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [files, setFiles] = useState<File[]>([]);
  const [roles, setRoles] = useState<FileRole[]>([]);
  const [questionText, setQuestionText] = useState("");
  const [answerKeyText, setAnswerKeyText] = useState("");
  const [explanationText, setExplanationText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<ExtractionSummary | null>(null);
  const [testId, setTestId] = useState<string | null>(null);
  const [progressSteps, setProgressSteps] = useState<string[]>([]);

  useEffect(() => {
    if (searchParams.get("demo") === "1") {
      void runDemo();
    }
  }, [searchParams]);

  async function runDemo() {
    setLoading(true);
    setError("");
    try {
      const demoTestId = `demo_${Date.now()}`;
      const result = await extractQuestions(demoTestId, true);
      localStorage.setItem("cbt-forge-test-id", result.test_id);
      setTestId(result.test_id);
      setSummary(result.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo extraction failed.");
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    if (files.length === 0 && !questionText.trim()) {
      setError("Upload a PDF, TXT, or JSON file, or paste question text.");
      return;
    }
    setLoading(true);
    setError("");
    setSummary(null);
    setProgressSteps(buildProgressSteps(files, Boolean(questionText.trim())));
    try {
      const upload = await uploadInputs({ files, roles, questionText, answerKeyText, explanationText });
      const result = await extractQuestions(upload.test_id);
      localStorage.setItem("cbt-forge-test-id", result.test_id);
      setTestId(result.test_id);
      setSummary(result.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb] px-5 py-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex items-center justify-between border-b border-line pb-4">
          <div>
            <div className="text-xl font-semibold text-ink">CBT Forge</div>
            <div className="text-sm text-steel">Import local question files into validated JSON.</div>
          </div>
          <button className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink" onClick={runDemo}>
            Load Demo
          </button>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <section className="space-y-5 rounded-lg border border-line bg-white p-5 shadow-panel">
            <FileUploader files={files} roles={roles} onChange={(nextFiles, nextRoles) => { setFiles(nextFiles); setRoles(nextRoles); }} onError={setError} />
            <div className="flex flex-wrap items-center gap-3 text-sm text-steel">
              <span>Supported formats: PDF • TXT • JSON • PNG • JPG • JPEG • WEBP</span>
              <a className="font-semibold text-forge hover:underline" href="/templates/cbt-forge-template.txt" download>Download TXT Template</a>
              <a className="font-semibold text-forge hover:underline" href="/templates/cbt-forge-template.json" download>Download JSON Template</a>
            </div>
            <div className="grid gap-4">
              {[
                ["Paste Text", questionText, setQuestionText],
                ["Paste Answer Key", answerKeyText, setAnswerKeyText],
                ["Paste Explanation", explanationText, setExplanationText]
              ].map(([label, value, setter]) => (
                <label key={label as string} className="block">
                  <span className="mb-2 block text-sm font-semibold text-ink">{label as string}</span>
                  <textarea
                    className="focus-ring min-h-28 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink"
                    value={value as string}
                    onChange={(event) => (setter as (next: string) => void)(event.target.value)}
                  />
                </label>
              ))}
            </div>
          </section>

          <aside className="space-y-4">
            {error ? <ErrorMessage message={error} /> : null}
            {loading ? <Loading label="Processing locally" /> : null}
            {loading && progressSteps.length ? <div className="rounded-lg border border-line bg-white p-5 shadow-panel"><h2 className="text-base font-semibold text-ink">Import Progress</h2><ol className="mt-3 space-y-2 text-sm text-steel">{progressSteps.map((step) => <li key={step}>{step}</li>)}</ol></div> : null}
            <div className="rounded-lg border border-line bg-white p-5 shadow-panel">
              <h2 className="text-base font-semibold text-ink">Extraction</h2>
              <p className="mt-2 text-sm leading-6 text-steel">All imports use local PDF, text, and JSON parsers. AI assistance is currently disabled and never blocks import.</p>
              <button className="mt-5 w-full rounded-md bg-forge px-4 py-3 text-sm font-semibold text-white hover:bg-[#185963]" disabled={loading} onClick={submit}>
                Extract Questions
              </button>
            </div>
            {summary ? (
              <div className="rounded-lg border border-line bg-white p-5 shadow-panel">
                <h2 className="text-base font-semibold text-ink">Extraction Complete</h2>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-steel">Questions found</dt><dd className="font-semibold text-ink">{summary.questions_found}</dd></div>
                  <div><dt className="text-steel">Valid</dt><dd className="font-semibold text-green-700">{summary.valid}</dd></div>
                  <div><dt className="text-steel">Warnings</dt><dd className="font-semibold text-amber-700">{summary.warnings}</dd></div>
                  <div><dt className="text-steel">Errors</dt><dd className="font-semibold text-red-700">{summary.errors}</dd></div>
                  <div><dt className="text-steel">Pages processed</dt><dd className="font-semibold text-ink">{summary.pages_processed} / {summary.pages_total}</dd></div>
                  <div><dt className="text-steel">OCR pages</dt><dd className="font-semibold text-ink">{summary.pages_ocr}</dd></div>
                  <div><dt className="text-steel">Failed pages</dt><dd className="font-semibold text-ink">{summary.pages_failed}</dd></div>
                </dl>
                {summary.warnings_list.length ? <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{summary.warnings_list.map((warning) => <div key={warning}>{warning}</div>)}</div> : null}
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button className="rounded-md bg-forge px-4 py-2 text-sm font-semibold text-white" onClick={() => router.push(`/review/${testId}`)}>
                    Review Questions
                  </button>
                  <button className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-ink" onClick={() => { setFiles([]); setRoles([]); setSummary(null); }}>
                    Start Over
                  </button>
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}

function buildProgressSteps(files: File[], hasPastedText: boolean) {
  const extensions = new Set(files.map((file) => file.name.split(".").pop()?.toLowerCase()));
  const steps: string[] = [];
  if (extensions.has("pdf")) steps.push("Reading PDF", "Extracting text", "Detecting images", "Running OCR where necessary");
  if (extensions.has("txt") || hasPastedText) steps.push("Reading text", "Detecting questions", "Parsing options", "Reading answers", "Reading explanations");
  if (extensions.has("json")) steps.push("Reading JSON", "Validating schema", "Normalizing questions");
  steps.push("Validating questions", "Complete");
  return Array.from(new Set(steps));
}
