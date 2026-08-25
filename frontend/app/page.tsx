import Link from "next/link";
import { AppNav } from "@/components/common/AppNav";
import { HomeActions } from "@/components/common/HomeActions";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f7f8fb]">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <nav className="flex items-center justify-between border-b border-line pb-5">
          <div className="text-lg font-semibold tracking-normal text-ink">CBT Forge</div>
          <AppNav />
        </nav>
        <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-accent">Phase 1 extraction workspace</p>
            <h1 className="max-w-3xl text-5xl font-semibold leading-tight tracking-normal text-ink md:text-6xl">CBT Forge</h1>
            <p className="mt-5 max-w-2xl text-xl leading-8 text-steel">Turn any question paper into a realistic CBT.</p>
            <HomeActions />
          </div>
          <div className="rounded-lg border border-line bg-white p-5 shadow-panel">
            <div className="border-b border-line pb-4">
              <div className="text-sm font-semibold text-ink">Extraction pipeline</div>
              <div className="mt-1 text-sm text-steel">PDF, TXT, and JSON to validated JSON to review</div>
            </div>
            {["Local PDF/TXT/JSON Import", "Realistic CBT", "Advanced Analytics", "Weak Topic Detection", "Detailed Explanations", "Export Reports"].map((item, index) => (
              <div key={item} className="flex items-center gap-4 border-b border-line py-4 last:border-b-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-md border border-line bg-[#f7f8fb] text-sm font-semibold text-forge">{index + 1}</div>
                <div className="text-sm font-medium text-ink">{item}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
