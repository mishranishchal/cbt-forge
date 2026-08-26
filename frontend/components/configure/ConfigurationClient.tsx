"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { Loading } from "@/components/common/Loading";
import { getConfiguration, getQuestions, saveConfiguration, validateConfiguration } from "@/lib/api";
import type { BehaviorConfig, ConfigurationValidationResult, MarkingScheme, NavigationConfig, Question, TestConfiguration, TestSection } from "@/lib/types";

const input = "focus-ring w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-steel";
const defaultMarking: MarkingScheme = { correct: "1", wrong: "0", unattempted: "0" };

const navigationLabels: Record<keyof NavigationConfig, string> = {
  section_switching: "Allow section switching",
  back_navigation: "Allow back navigation",
  previous_question: "Show Previous control",
  next_question: "Show Save & Next control",
  clear_response: "Allow clear response",
  mark_for_review: "Allow mark for review",
  question_palette: "Show question palette",
};

const behaviorLabels: Record<keyof BehaviorConfig, string> = {
  shuffle_questions: "Shuffle questions",
  shuffle_options: "Shuffle options",
  auto_submit: "Auto-submit on timeout",
};

export function ConfigurationClient({ testId }: { testId: string }) {
  const [configuration, setConfiguration] = useState<TestConfiguration | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [validation, setValidation] = useState<ConfigurationValidationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => { void load(); }, [testId]);

  async function load() {
    try {
      const [config, bank] = await Promise.all([getConfiguration(testId), getQuestions(testId)]);
      setConfiguration(config);
      setQuestions(bank);
      setValidation(await validateConfiguration(testId, config));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load configuration.");
    } finally {
      setLoading(false);
    }
  }

  function patch(next: TestConfiguration) {
    setConfiguration(next);
    void validateConfiguration(testId, next).then(setValidation).catch(() => undefined);
  }

  function updateSection(index: number, update: Partial<TestSection>) {
    if (!configuration) return;
    const sections = [...configuration.sections];
    sections[index] = { ...sections[index], ...update };
    patch({ ...configuration, sections });
  }

  function updateNavigation(key: keyof NavigationConfig, value: boolean) {
    if (!configuration) return;
    patch({ ...configuration, test: { ...configuration.test, navigation: { ...configuration.test.navigation, [key]: value } } });
  }

  function updateBehavior(key: keyof BehaviorConfig, value: boolean) {
    if (!configuration) return;
    patch({ ...configuration, test: { ...configuration.test, behavior: { ...configuration.test.behavior, [key]: value } } });
  }

  function setMarkingMode(overall: boolean) {
    if (!configuration) return;
    patch({ ...configuration, test: { ...configuration.test, use_global_marking: overall } });
  }

  function toggleQuestion(index: number, questionId: string) {
    if (!configuration) return;
    const section = configuration.sections[index];
    const question_ids = section.question_ids.includes(questionId)
      ? section.question_ids.filter((id) => id !== questionId)
      : [...section.question_ids, questionId];
    updateSection(index, { question_ids, expected_question_count: question_ids.length, selection_mode: "manual" });
  }

  function addSection() {
    if (!configuration) return;
    patch({
      ...configuration,
      sections: [...configuration.sections, {
        id: `section_${Date.now()}`,
        name: "New Section",
        description: "",
        duration_minutes: 30,
        expected_question_count: 0,
        marking: { ...defaultMarking },
        question_ids: [],
        selection_mode: "manual",
        allow_section_switching: true,
      }],
    });
  }

  async function save() {
    if (!configuration) return;
    setSaving(true);
    setError("");
    try {
      const checked = await validateConfiguration(testId, configuration);
      setValidation(checked);
      if (!checked.valid) return;
      setConfiguration(await saveConfiguration(testId, configuration));
      setMessage("Configuration saved. These settings are used by preview, runtime, scoring, and exports.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save configuration.");
    } finally {
      setSaving(false);
    }
  }

  const totals = useMemo(() => ({
    questions: configuration?.sections.reduce((sum, section) => sum + section.question_ids.length, 0) ?? 0,
    duration: configuration?.test.timing.mode === "section"
      ? configuration.sections.reduce((sum, section) => sum + section.duration_minutes, 0)
      : configuration?.test.timing.total_minutes ?? 0,
  }), [configuration]);

  if (loading) return <main className="min-h-screen bg-[#f7f8fb] p-5"><Loading label="Loading configuration" /></main>;
  if (!configuration) return <main className="min-h-screen bg-[#f7f8fb] p-5"><ErrorMessage message={error || "Configuration unavailable."} /></main>;

  const mode = configuration.test.use_global_marking ? "overall" : "section";

  return (
    <main className="min-h-screen bg-[#f7f8fb] px-4 py-5">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-lg border border-line bg-white p-5 shadow-panel">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><div className="text-sm font-semibold uppercase text-accent">CBT Forge</div><h1 className="mt-1 text-2xl font-semibold text-ink">Test Configuration</h1><p className="mt-1 text-sm text-steel">Define the settings used by every test attempt.</p></div>
            <div className="flex flex-wrap gap-2"><Link className="rounded-md border border-line px-3 py-2 text-sm font-semibold text-ink" href={`/review/${testId}`}>Review</Link><Link className="rounded-md border border-line px-3 py-2 text-sm font-semibold text-ink" href={`/configure/${testId}/preview`}>Preview</Link><button className="rounded-md bg-forge px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={saving || validation?.valid === false} onClick={() => void save()}>Save Configuration</button></div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3"><Stat label="Assigned questions" value={totals.questions} /><Stat label="Sections" value={configuration.sections.length} /><Stat label="Duration" value={`${totals.duration} min`} /></div>
        </header>

        {error ? <ErrorMessage message={error} /> : null}
        {message ? <div className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800">{message}</div> : null}
        {validation ? <Validation result={validation} /> : null}

        <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <section className="space-y-5">
            <Panel title="Test Information"><Field label="Test name"><input className={input} value={configuration.test.title} onChange={(event) => patch({ ...configuration, test: { ...configuration.test, title: event.target.value } })} /></Field><Field label="Description"><textarea className={`${input} min-h-20`} value={configuration.test.description} onChange={(event) => patch({ ...configuration, test: { ...configuration.test, description: event.target.value } })} /></Field></Panel>
            <Panel title="Marking Mode"><div className="grid gap-2 text-sm text-ink"><label className="flex items-center gap-2"><input type="radio" name="marking-mode" checked={mode === "overall"} onChange={() => setMarkingMode(true)} /> Overall marking</label><label className="flex items-center gap-2"><input type="radio" name="marking-mode" checked={mode === "section"} onChange={() => setMarkingMode(false)} /> Section-wise marking</label></div>{mode === "overall" ? <MarkingEditor marking={configuration.test.global_marking} onChange={(global_marking) => patch({ ...configuration, test: { ...configuration.test, global_marking } })} /> : <p className="mt-3 text-sm text-steel">Each section below has its own correct, incorrect, and unattempted marks.</p>}<p className="mt-3 text-xs text-steel">Precedence: question override, then {mode === "overall" ? "overall" : "section"} marking.</p></Panel>
            <Panel title="Timing"><div className="flex flex-wrap gap-4 text-sm text-ink"><label><input type="radio" checked={configuration.test.timing.mode === "single"} onChange={() => patch({ ...configuration, test: { ...configuration.test, timing: { ...configuration.test.timing, mode: "single" } } })} /> One timer</label><label><input type="radio" checked={configuration.test.timing.mode === "section"} onChange={() => patch({ ...configuration, test: { ...configuration.test, timing: { ...configuration.test.timing, mode: "section" } } })} /> Section timers</label></div><Field label="Total duration (minutes)"><input className={input} type="number" min="1" value={configuration.test.timing.total_minutes} onChange={(event) => patch({ ...configuration, test: { ...configuration.test, timing: { ...configuration.test.timing, total_minutes: Number(event.target.value) || 1 } } })} /></Field></Panel>
            <Panel title="Navigation & Behavior"><div className="space-y-2">{(Object.keys(navigationLabels) as Array<keyof NavigationConfig>).map((key) => <Toggle key={key} label={navigationLabels[key]} checked={configuration.test.navigation[key]} onChange={(value) => updateNavigation(key, value)} />)}</div><div className="mt-4 border-t border-line pt-4 text-xs font-semibold uppercase text-steel">Behavior</div><div className="mt-2 space-y-2">{(Object.keys(behaviorLabels) as Array<keyof BehaviorConfig>).map((key) => <Toggle key={key} label={behaviorLabels[key]} checked={configuration.test.behavior[key]} onChange={(value) => updateBehavior(key, value)} />)}</div></Panel>
          </section>

          <section className="space-y-5">
            <Panel title="Sections" action={<button className="rounded-md bg-forge px-3 py-2 text-sm font-semibold text-white" onClick={addSection}>Add Section</button>}>
              {configuration.sections.map((section, index) => <article key={section.id} className="mt-4 rounded-md border border-line p-4"><div className="grid gap-3 md:grid-cols-2"><Field label="Name"><input className={input} value={section.name} onChange={(event) => updateSection(index, { name: event.target.value })} /></Field><Field label="Time limit"><input className={input} type="number" min="1" value={section.duration_minutes} onChange={(event) => updateSection(index, { duration_minutes: Number(event.target.value) || 1 })} /></Field></div>{mode === "section" ? <MarkingEditor marking={section.marking} onChange={(marking) => updateSection(index, { marking })} /> : null}<Field label="Section description"><textarea className={`${input} min-h-16`} value={section.description} onChange={(event) => updateSection(index, { description: event.target.value })} /></Field><div className="mt-3"><Toggle label="Allow switching to this section" checked={section.allow_section_switching} onChange={(allow_section_switching) => updateSection(index, { allow_section_switching })} /></div><div className="mt-3 text-xs text-steel">Selected: {section.question_ids.length} / {questions.length}</div><div className="mt-2 max-h-48 overflow-auto rounded-md border border-line">{questions.map((question) => <label key={question.id} className="flex items-center gap-2 border-b border-line p-2 text-sm text-ink last:border-b-0"><input type="checkbox" checked={section.question_ids.includes(question.id)} onChange={() => toggleQuestion(index, question.id)} /><span className="font-semibold">{question.question_number ?? question.id}</span><span className="truncate">{question.question_text}</span></label>)}</div></article>)}
            </Panel>
            <Panel title="Exam Instructions"><textarea className={`${input} min-h-48`} value={configuration.test.instructions} onChange={(event) => patch({ ...configuration, test: { ...configuration.test, instructions: event.target.value } })} /></Panel>
          </section>
        </div>
      </div>
    </main>
  );
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) { return <section className="rounded-lg border border-line bg-white p-5 shadow-panel"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-ink">{title}</h2>{action}</div>{children}</section>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="mt-3 block"><span className="mb-1 block text-xs font-semibold uppercase text-steel">{label}</span>{children}</label>; }
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />{label}</label>; }
function MarkingEditor({ marking, onChange }: { marking: MarkingScheme; onChange: (value: MarkingScheme) => void }) { return <div className="mt-3 grid gap-3 md:grid-cols-3"><Field label="Correct marks"><input className={input} value={marking.correct} onChange={(event) => onChange({ ...marking, correct: event.target.value })} /></Field><Field label="Incorrect marks"><input className={input} value={marking.wrong} onChange={(event) => onChange({ ...marking, wrong: event.target.value })} /></Field><Field label="Unattempted marks"><input className={input} value={marking.unattempted} onChange={(event) => onChange({ ...marking, unattempted: event.target.value })} /></Field></div>; }
function Stat({ label, value }: { label: string; value: string | number }) { return <div className="rounded-md border border-line bg-[#fafbfc] p-3"><div className="text-xs uppercase text-steel">{label}</div><div className="mt-1 text-lg font-semibold text-ink">{value}</div></div>; }
function Validation({ result }: { result: ConfigurationValidationResult }) { return <section className="rounded-lg border border-line bg-white p-4"><div className="font-semibold text-ink">Validation</div>{result.errors.map((item) => <div key={item} className="mt-2 rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-800">{item}</div>)}{result.warnings.map((item) => <div key={item} className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900">{item}</div>)}{!result.errors.length && !result.warnings.length ? <div className="mt-2 text-sm text-green-700">Configuration is valid.</div> : null}</section>; }
