"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppNav } from "@/components/common/AppNav";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { Loading } from "@/components/common/Loading";
import { createDemoTest, listTests } from "@/lib/api";

type TestRow = Awaited<ReturnType<typeof listTests>>[number];

export function TestsClient() {
  const [tests, setTests] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      setTests(await listTests());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tests could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function demo() {
    await createDemoTest();
    await load();
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb] px-4 py-5">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="rounded-lg border border-line bg-white p-5 shadow-panel">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><div className="text-sm font-semibold uppercase text-accent">CBT Forge</div><h1 className="mt-1 text-2xl font-semibold text-ink">My Tests</h1></div>
            <AppNav />
          </div>
        </header>
        {error ? <ErrorMessage message={error} /> : null}
        {loading ? <Loading label="Loading tests" /> : null}
        {!loading && !tests.length ? (
          <div className="rounded-lg border border-line bg-white p-6 shadow-panel">
            <p className="text-sm text-steel">No tests yet.</p>
            <div className="mt-4 flex gap-3">
              <Link className="rounded-md bg-forge px-4 py-2 text-sm font-semibold text-white" href="/upload">Create CBT</Link>
              <button className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-ink" onClick={demo}>Create Demo Test</button>
            </div>
          </div>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          {tests.map((test) => (
            <article key={test.test_id} className="rounded-lg border border-line bg-white p-5 shadow-panel">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-ink">{test.title || test.test_id}</h2>
                  <p className="mt-1 text-sm text-steel">{test.test_id}</p>
                </div>
                {test.demo ? <span className="rounded-md border border-forge px-2 py-1 text-xs font-semibold text-forge">Demo</span> : null}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link className="rounded-md border border-line px-3 py-2 text-sm font-semibold text-ink" href={`/review/${test.test_id}`}>Review</Link>
                <Link className="rounded-md border border-line px-3 py-2 text-sm font-semibold text-ink" href={`/configure/${test.test_id}`}>Configure</Link>
                <Link className="rounded-md bg-forge px-3 py-2 text-sm font-semibold text-white" href={`/test/${test.test_id}`}>Start CBT</Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}


