"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteAttempt, exportUrl, getHistory, retakeAttempt } from "@/lib/api";
import type { HistoryItem } from "@/lib/types";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { Loading } from "@/components/common/Loading";
import { AppNav } from "@/components/common/AppNav";

export function HistoryClient() {
  const router = useRouter();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      setItems(await getHistory());
    } catch (err) {
      setError(err instanceof Error ? err.message : "History could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function retake(attemptId: string) {
    const attempt = await retakeAttempt(attemptId);
    router.push(`/test/${attempt.test_id}`);
  }

  async function remove(attemptId: string) {
    if (!confirm("Delete this attempt? The original test will not be deleted.")) return;
    await deleteAttempt(attemptId);
    await load();
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb] px-4 py-5">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-lg border border-line bg-white p-5 shadow-panel">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold uppercase text-accent">CBT Forge</div>
              <h1 className="mt-1 text-2xl font-semibold text-ink">Attempt History</h1>
            </div>
            <AppNav />
          </div>
        </header>
        {error ? <ErrorMessage message={error} /> : null}
        {loading ? <Loading label="Loading history" /> : null}
        {!loading && !items.length ? <div className="rounded-lg border border-line bg-white p-6 text-sm text-steel shadow-panel">No attempts yet.</div> : null}
        {items.length ? (
          <div className="overflow-auto rounded-lg border border-line bg-white p-5 shadow-panel">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-steel">
                <tr>{["Test", "Date", "Score", "Accuracy", "Attempted", "Status", "Actions"].map((item) => <th key={item} className="border-b border-line py-2 pr-3">{item}</th>)}</tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.attempt_id}>
                    <td className="border-b border-line py-3 pr-3 font-medium text-ink">{item.title}</td>
                    <td className="border-b border-line py-3 pr-3 text-steel">{new Date(item.date).toLocaleString()}</td>
                    <td className="border-b border-line py-3 pr-3">{item.score == null ? "-" : `${item.score.toFixed(2)} / ${item.maximum_score?.toFixed(2)}`}</td>
                    <td className="border-b border-line py-3 pr-3">{item.accuracy == null ? "-" : `${item.accuracy.toFixed(2)}%`}</td>
                    <td className="border-b border-line py-3 pr-3">{item.attempted ?? "-"} / {item.total_questions ?? "-"}</td>
                    <td className="border-b border-line py-3 pr-3">{item.status}</td>
                    <td className="border-b border-line py-3 pr-3">
                      <div className="flex flex-wrap gap-2">
                        {item.status === "IN_PROGRESS" ? <Link className="rounded-md border border-line px-2 py-1 font-medium text-forge" href={`/test/${item.test_id}`}>Resume</Link> : <Link className="rounded-md border border-line px-2 py-1 font-medium text-forge" href={`/result/${item.attempt_id}`}>View Result</Link>}
                        <button className="rounded-md border border-line px-2 py-1 font-medium text-ink" onClick={() => retake(item.attempt_id)}>Retake</button>
                        <a className="rounded-md border border-line px-2 py-1 font-medium text-ink" href={exportUrl(item.attempt_id, "json")}>Export</a>
                        <button className="rounded-md border border-red-200 px-2 py-1 font-medium text-red-700" onClick={() => remove(item.attempt_id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </main>
  );
}
