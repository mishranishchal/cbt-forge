import Link from "next/link";
import { getConfiguration } from "@/lib/api";

export default async function PreviewPage({ params }: { params: Promise<{ testId: string }> }) {
  const { testId } = await params;
  const configuration = await getConfiguration(testId);
  const duration = configuration.test.timing.mode === "section"
    ? configuration.sections.reduce((sum, section) => sum + section.duration_minutes, 0)
    : configuration.test.timing.total_minutes;

  return (
    <main className="min-h-screen bg-[#f7f8fb] px-4 py-5">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-lg border border-line bg-white p-5 shadow-panel">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold uppercase text-accent">CBT Forge</div>
              <h1 className="mt-1 text-2xl font-semibold text-ink">Test Preview</h1>
              <p className="mt-1 text-sm text-steel">This is a configuration preview, not the Phase 3 CBT engine.</p>
            </div>
            <div className="flex gap-2">
              <Link className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-ink" href={`/configure/${testId}`}>Back to Configuration</Link>
              <Link className="rounded-md bg-forge px-4 py-2 text-sm font-semibold text-white" href={`/configure/${testId}`}>Edit Configuration</Link>
              <Link className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white" href={`/test/${testId}`}>Start Test</Link>
            </div>
          </div>
        </header>

        <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
          <h2 className="text-xl font-semibold text-ink">{configuration.test.title}</h2>
          <p className="mt-2 text-sm text-steel">{configuration.test.description}</p>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <div className="rounded-md border border-line p-3"><div className="text-xs uppercase text-steel">Questions</div><div className="font-semibold">{configuration.sections.reduce((sum, section) => sum + section.question_ids.length, 0)}</div></div>
            <div className="rounded-md border border-line p-3"><div className="text-xs uppercase text-steel">Sections</div><div className="font-semibold">{configuration.sections.length}</div></div>
            <div className="rounded-md border border-line p-3"><div className="text-xs uppercase text-steel">Duration</div><div className="font-semibold">{duration} minutes</div></div>
            <div className="rounded-md border border-line p-3"><div className="text-xs uppercase text-steel">Switching</div><div className="font-semibold">{configuration.test.navigation.section_switching ? "Allowed" : "Sequential"}</div></div>
          </div>
        </section>

        <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
          <h2 className="text-lg font-semibold text-ink">Sections</h2>
          <div className="mt-4 grid gap-3">
            {configuration.sections.map((section) => (
              <div key={section.id} className="rounded-md border border-line p-4">
                <div className="font-semibold text-ink">{section.name}</div>
                <div className="mt-1 text-sm text-steel">{section.question_ids.length} Questions | {section.duration_minutes} Minutes | +{section.marking.correct} Correct | {section.marking.wrong} Wrong | {section.marking.unattempted} Unattempted</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
          <h2 className="text-lg font-semibold text-ink">Navigation & Behavior</h2>
          <div className="mt-3 text-sm leading-7 text-steel">
            Mark for Review: {configuration.test.navigation.mark_for_review ? "Enabled" : "Disabled"}<br />
            Question Palette: {configuration.test.navigation.question_palette ? "Enabled" : "Disabled"}<br />
            Shuffle Questions: {configuration.test.behavior.shuffle_questions ? "Enabled" : "Disabled"}<br />
            Shuffle Options: {configuration.test.behavior.shuffle_options ? "Enabled" : "Disabled"}<br />
            Auto-submit: {configuration.test.behavior.auto_submit ? "Enabled" : "Disabled"}
          </div>
        </section>

        <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
          <h2 className="text-lg font-semibold text-ink">Instructions</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-steel">{configuration.test.instructions}</p>
        </section>
      </div>
    </main>
  );
}
