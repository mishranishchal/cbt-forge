"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createDemoTest } from "@/lib/api";

export function HomeActions() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function tryDemo() {
    setLoading(true);
    try {
      const demo = await createDemoTest();
      router.push(demo.route);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-9 flex flex-wrap gap-3">
      <button className="rounded-md bg-forge px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#185963]" onClick={() => router.push("/upload")}>
        Create CBT
      </button>
      <button className="rounded-md border border-line bg-white px-5 py-3 text-sm font-semibold text-ink shadow-sm hover:border-forge" onClick={tryDemo} disabled={loading}>
        {loading ? "Preparing Demo..." : "Try Demo"}
      </button>
      <button className="rounded-md border border-line bg-white px-5 py-3 text-sm font-semibold text-ink shadow-sm hover:border-forge" onClick={() => router.push("/history")}>
        View History
      </button>
    </div>
  );
}
