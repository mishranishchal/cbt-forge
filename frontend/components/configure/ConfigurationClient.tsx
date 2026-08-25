// // "use client";

// // import Link from "next/link";
// // import { useEffect, useMemo, useState } from "react";
// // import { ErrorMessage } from "@/components/common/ErrorMessage";
// // import { Loading } from "@/components/common/Loading";
// // import { getConfiguration, getQuestions, saveConfiguration, validateConfiguration } from "@/lib/api";
// // import type { ConfigurationValidationResult, Question, TestConfiguration, TestSection } from "@/lib/types";

// // function numberValue(value: string): number {
// //   const parsed = Number(value);
// //   return Number.isFinite(parsed) ? parsed : 0;
// // }

// // export function ConfigurationClient({ testId }: { testId: string }) {
// //   const [configuration, setConfiguration] = useState<TestConfiguration | null>(null);
// //   const [questions, setQuestions] = useState<Question[]>([]);
// //   const [validation, setValidation] = useState<ConfigurationValidationResult | null>(null);
// //   const [loading, setLoading] = useState(true);
// //   const [saving, setSaving] = useState(false);
// //   const [error, setError] = useState("");
// //   const [message, setMessage] = useState("");

// //   useEffect(() => {
// //     async function load() {
// //       try {
// //         const [config, loadedQuestions] = await Promise.all([getConfiguration(testId), getQuestions(testId)]);
// //         setConfiguration(config);
// //         setQuestions(loadedQuestions);
// //         setValidation(await validateConfiguration(testId, config));
// //       } catch (err) {
// //         setError(err instanceof Error ? err.message : "Could not load configuration.");
// //       } finally {
// //         setLoading(false);
// //       }
// //     }
// //     void load();
// //   }, [testId]);

// //   const totals = useMemo(() => {
// //     if (!configuration) return { questions: 0, duration: 0, negative: false };
// //     return {
// //       questions: configuration.sections.reduce((sum, section) => sum + section.question_ids.length, 0),
// //       duration: configuration.test.timing.mode === "section" ? configuration.sections.reduce((sum, section) => sum + section.duration_minutes, 0) : configuration.test.timing.total_minutes,
// //       negative: configuration.sections.some((section) => section.marking.wrong < 0) || configuration.test.global_marking.wrong < 0
// //     };
// //   }, [configuration]);

// //   function patchConfig(next: TestConfiguration) {
// //     setConfiguration(next);
// //     void validateConfiguration(testId, next).then(setValidation).catch(() => undefined);
// //   }

// //   function updateSection(index: number, update: Partial<TestSection>) {
// //     if (!configuration) return;
// //     const sections = [...configuration.sections];
// //     sections[index] = { ...sections[index], ...update };
// //     patchConfig({ ...configuration, sections });
// //   }

// //   function addSection() {
// //     if (!configuration) return;
// //     const id = `section_${Date.now()}`;
// //     patchConfig({
// //       ...configuration,
// //       sections: [
// //         ...configuration.sections,
// //         {
// //           id,
// //           name: "New Section",
// //           description: "",
// //           duration_minutes: 30,
// //           expected_question_count: 0,
// //           marking: { correct: 1, wrong: -0.25, unattempted: 0 },
// //           question_ids: [],
// //           selection_mode: "manual",
// //           allow_section_switching: true
// //         }
// //       ]
// //     });
// //   }

// //   function duplicateSection(index: number) {
// //     if (!configuration) return;
// //     const source = configuration.sections[index];
// //     const copy = { ...source, id: `section_${Date.now()}`, name: `${source.name} Copy`, question_ids: [...source.question_ids] };
// //     const sections = [...configuration.sections];
// //     sections.splice(index + 1, 0, copy);
// //     patchConfig({ ...configuration, sections });
// //   }

// //   function moveSection(index: number, direction: -1 | 1) {
// //     if (!configuration) return;
// //     const target = index + direction;
// //     if (target < 0 || target >= configuration.sections.length) return;
// //     const sections = [...configuration.sections];
// //     [sections[index], sections[target]] = [sections[target], sections[index]];
// //     patchConfig({ ...configuration, sections });
// //   }

// //   function toggleQuestion(sectionIndex: number, questionId: string) {
// //     if (!configuration) return;
// //     const section = configuration.sections[sectionIndex];
// //     const question_ids = section.question_ids.includes(questionId)
// //       ? section.question_ids.filter((id) => id !== questionId)
// //       : [...section.question_ids, questionId];
// //     updateSection(sectionIndex, { question_ids, expected_question_count: question_ids.length, selection_mode: "manual" });
// //   }

// //   function automaticAssign(index: number) {
// //     if (!configuration) return;
// //     const section = configuration.sections[index];
// //     const question_ids = questions.filter((question) => (question.section || "General") === section.name).map((question) => question.id);
// //     updateSection(index, { question_ids, expected_question_count: question_ids.length, selection_mode: "automatic" });
// //   }

// //   async function save() {
// //     if (!configuration) return;
// //     setSaving(true);
// //     setError("");
// //     try {
// //       const result = await validateConfiguration(testId, configuration);
// //       setValidation(result);
// //       if (!result.valid) return;
// //       const saved = await saveConfiguration(testId, configuration);
// //       setConfiguration(saved);
// //       setMessage("Configuration saved.");
// //     } catch (err) {
// //       setError(err instanceof Error ? err.message : "Configuration save failed.");
// //     } finally {
// //       setSaving(false);
// //     }
// //   }

// //   if (loading) return <main className="min-h-screen bg-[#f7f8fb] p-5"><Loading label="Loading configuration" /></main>;
// //   if (!configuration) return <main className="min-h-screen bg-[#f7f8fb] p-5"><ErrorMessage message={error || "Configuration unavailable."} /></main>;

// //   return (
// //     <main className="min-h-screen bg-[#f7f8fb] px-4 py-5">
// //       <div className="mx-auto max-w-7xl space-y-5">
// //         <header className="rounded-lg border border-line bg-white p-5 shadow-panel">
// //           <div className="flex flex-wrap items-start justify-between gap-4">
// //             <div>
// //               <div className="text-sm font-semibold uppercase text-accent">CBT Forge</div>
// //               <h1 className="mt-1 text-2xl font-semibold text-ink">Test Configuration</h1>
// //               <p className="mt-1 text-sm text-steel">Configure timing, marking, navigation, sections, and question assignment for Phase 3.</p>
// //             </div>
// //             <div className="flex flex-wrap gap-2">
// //               <Link className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-ink" href={`/review/${testId}`}>Back to Review</Link>
// //               <Link className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-forge" href={`/configure/${testId}/preview`}>Preview Test</Link>
// //               <button className="rounded-md bg-forge px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" onClick={save} disabled={saving || validation?.valid === false}>Save Configuration</button>
// //             </div>
// //           </div>
// //           <div className="mt-5 grid gap-3 md:grid-cols-6">
// //             {[
// //               ["Questions", totals.questions],
// //               ["Sections", configuration.sections.length],
// //               ["Duration", `${totals.duration} min`],
// //               ["Switching", configuration.test.navigation.section_switching ? "Allowed" : "Blocked"],
// //               ["Negative", totals.negative ? "Enabled" : "Disabled"],
// //               ["Auto-submit", configuration.test.behavior.auto_submit ? "On" : "Off"]
// //             ].map(([label, value]) => <div key={label} className="rounded-md border border-line bg-[#fafbfc] p-3"><div className="text-xs uppercase text-steel">{label}</div><div className="mt-1 font-semibold text-ink">{value}</div></div>)}
// //           </div>
// //         </header>

// //         {error ? <ErrorMessage message={error} /> : null}
// //         {message ? <div className="rounded-md border border-line bg-white px-4 py-3 text-sm text-steel">{message}</div> : null}
// //         {validation ? (
// //           <div className="rounded-lg border border-line bg-white p-4 shadow-panel">
// //             <div className="font-semibold text-ink">Configuration Validation</div>
// //             <div className="mt-2 grid gap-2 text-sm">
// //               {validation.errors.map((item) => <div key={item} className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700">{item}</div>)}
// //               {validation.warnings.map((item) => <div key={item} className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">{item}</div>)}
// //               {!validation.errors.length && !validation.warnings.length ? <div className="text-green-700">Configuration is valid.</div> : null}
// //             </div>
// //           </div>
// //         ) : null}

// //         <section className="grid gap-5 lg:grid-cols-[420px_1fr]">
// //           <div className="space-y-5">
// //             <div className="rounded-lg border border-line bg-white p-5 shadow-panel">
// //               <h2 className="text-lg font-semibold text-ink">Test Information</h2>
// //               <div className="mt-4 grid gap-3">
// //                 <label className="block"><span className="mb-1 block text-xs font-semibold uppercase text-steel">Test Name</span><input className="focus-ring w-full rounded-md border border-line px-3 py-2 text-sm" value={configuration.test.title} onChange={(event) => patchConfig({ ...configuration, test: { ...configuration.test, title: event.target.value } })} /></label>
// //                 <label className="block"><span className="mb-1 block text-xs font-semibold uppercase text-steel">Description</span><textarea className="focus-ring min-h-20 w-full rounded-md border border-line px-3 py-2 text-sm" value={configuration.test.description} onChange={(event) => patchConfig({ ...configuration, test: { ...configuration.test, description: event.target.value } })} /></label>
// //                 <label className="block"><span className="mb-1 block text-xs font-semibold uppercase text-steel">Optional Test ID</span><input className="focus-ring w-full rounded-md border border-line px-3 py-2 text-sm" value={configuration.test.id} readOnly /></label>
// //               </div>
// //             </div>

// //             <div className="rounded-lg border border-line bg-white p-5 shadow-panel">
// //               <h2 className="text-lg font-semibold text-ink">Timing</h2>
// //               <div className="mt-4 space-y-3 text-sm">
// //                 <label className="flex items-center gap-2"><input type="radio" checked={configuration.test.timing.mode === "single"} onChange={() => patchConfig({ ...configuration, test: { ...configuration.test, timing: { ...configuration.test.timing, mode: "single" } } })} /> One timer for entire test</label>
// //                 <label className="flex items-center gap-2"><input type="radio" checked={configuration.test.timing.mode === "section"} onChange={() => patchConfig({ ...configuration, test: { ...configuration.test, timing: { ...configuration.test.timing, mode: "section", total_minutes: configuration.sections.reduce((sum, section) => sum + section.duration_minutes, 0) } } })} /> Separate timer for each section</label>
// //                 <label className="block"><span className="mb-1 block text-xs font-semibold uppercase text-steel">Total duration</span><input type="number" min={1} className="focus-ring w-full rounded-md border border-line px-3 py-2" value={configuration.test.timing.total_minutes} onChange={(event) => patchConfig({ ...configuration, test: { ...configuration.test, timing: { ...configuration.test.timing, total_minutes: numberValue(event.target.value) } } })} /></label>
// //                 <div className="text-steel">Total Test Time: {totals.duration} minutes</div>
// //               </div>
// //             </div>

// //             <div className="rounded-lg border border-line bg-white p-5 shadow-panel">
// //               <h2 className="text-lg font-semibold text-ink">Navigation & Behavior</h2>
// //               <div className="mt-4 grid gap-2 text-sm">
// //                 {[
// //                   ["section_switching", "Allow switching between sections"],
// //                   ["back_navigation", "Allow Back Navigation"],
// //                   ["previous_question", "Allow Previous Question"],
// //                   ["next_question", "Allow Next Question"],
// //                   ["clear_response", "Allow Clear Response"],
// //                   ["mark_for_review", "Allow Mark for Review"],
// //                   ["question_palette", "Allow Question Palette"]
// //                 ].map(([key, label]) => (
// //                   <label key={key} className="flex items-center gap-2"><input type="checkbox" checked={Boolean(configuration.test.navigation[key as keyof typeof configuration.test.navigation])} onChange={(event) => patchConfig({ ...configuration, test: { ...configuration.test, navigation: { ...configuration.test.navigation, [key]: event.target.checked } } })} /> {label}</label>
// //                 ))}
// //                 <label className="flex items-center gap-2"><input type="checkbox" checked={configuration.test.behavior.shuffle_questions} onChange={(event) => patchConfig({ ...configuration, test: { ...configuration.test, behavior: { ...configuration.test.behavior, shuffle_questions: event.target.checked } } })} /> Shuffle Questions</label>
// //                 <label className="flex items-center gap-2"><input type="checkbox" checked={configuration.test.behavior.shuffle_options} onChange={(event) => patchConfig({ ...configuration, test: { ...configuration.test, behavior: { ...configuration.test.behavior, shuffle_options: event.target.checked } } })} /> Shuffle Options</label>
// //                 <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">Shuffling changes question order during the test. Question IDs remain unchanged.</div>
// //                 <label className="flex items-center gap-2"><input type="checkbox" checked={configuration.test.behavior.auto_submit} onChange={(event) => patchConfig({ ...configuration, test: { ...configuration.test, behavior: { ...configuration.test.behavior, auto_submit: event.target.checked } } })} /> Auto-submit when timer expires</label>
// //               </div>
// //             </div>
// //           </div>

// //           <div className="space-y-5">
// //             <div className="rounded-lg border border-line bg-white p-5 shadow-panel">
// //               <div className="flex items-center justify-between gap-3">
// //                 <h2 className="text-lg font-semibold text-ink">Sections</h2>
// //                 <button className="rounded-md bg-forge px-3 py-2 text-sm font-semibold text-white" onClick={addSection}>Add Section</button>
// //               </div>
// //               <div className="mt-4 space-y-4">
// //                 {configuration.sections.map((section, index) => (
// //                   <div key={section.id} className="rounded-md border border-line p-4">
// //                     <div className="grid gap-3 md:grid-cols-2">
// //                       <label><span className="mb-1 block text-xs font-semibold uppercase text-steel">Name</span><input className="focus-ring w-full rounded-md border border-line px-3 py-2 text-sm" value={section.name} onChange={(event) => updateSection(index, { name: event.target.value })} /></label>
// //                       <label><span className="mb-1 block text-xs font-semibold uppercase text-steel">Time limit</span><input type="number" min={1} className="focus-ring w-full rounded-md border border-line px-3 py-2 text-sm" value={section.duration_minutes} onChange={(event) => updateSection(index, { duration_minutes: numberValue(event.target.value) })} /></label>
// //                       <label><span className="mb-1 block text-xs font-semibold uppercase text-steel">Correct</span><input type="number" step="0.25" min={0} className="focus-ring w-full rounded-md border border-line px-3 py-2 text-sm" value={section.marking.correct} onChange={(event) => updateSection(index, { marking: { ...section.marking, correct: numberValue(event.target.value) } })} /></label>
// //                       <label><span className="mb-1 block text-xs font-semibold uppercase text-steel">Wrong</span><input type="number" step="0.25" max={0} className="focus-ring w-full rounded-md border border-line px-3 py-2 text-sm" value={section.marking.wrong} onChange={(event) => updateSection(index, { marking: { ...section.marking, wrong: numberValue(event.target.value) } })} /></label>
// //                       <label><span className="mb-1 block text-xs font-semibold uppercase text-steel">Unattempted</span><input type="number" step="0.25" className="focus-ring w-full rounded-md border border-line px-3 py-2 text-sm" value={section.marking.unattempted} onChange={(event) => updateSection(index, { marking: { ...section.marking, unattempted: numberValue(event.target.value) } })} /></label>
// //                       <label><span className="mb-1 block text-xs font-semibold uppercase text-steel">Expected questions</span><input type="number" min={0} className="focus-ring w-full rounded-md border border-line px-3 py-2 text-sm" value={section.expected_question_count ?? section.question_ids.length} onChange={(event) => updateSection(index, { expected_question_count: numberValue(event.target.value) })} /></label>
// //                     </div>
// //                     <textarea className="focus-ring mt-3 min-h-16 w-full rounded-md border border-line px-3 py-2 text-sm" placeholder="Section description" value={section.description} onChange={(event) => updateSection(index, { description: event.target.value })} />
// //                     <div className="mt-3 flex flex-wrap gap-2">
// //                       <button className="rounded-md border border-line px-3 py-2 text-sm font-medium text-ink" onClick={() => automaticAssign(index)}>Automatic Assign</button>
// //                       <button className="rounded-md border border-line px-3 py-2 text-sm font-medium text-ink" onClick={() => duplicateSection(index)}>Duplicate</button>
// //                       <button className="rounded-md border border-line px-3 py-2 text-sm font-medium text-ink" onClick={() => moveSection(index, -1)}>Move Up</button>
// //                       <button className="rounded-md border border-line px-3 py-2 text-sm font-medium text-ink" onClick={() => moveSection(index, 1)}>Move Down</button>
// //                       <button className="rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700" onClick={() => patchConfig({ ...configuration, sections: configuration.sections.filter((_, itemIndex) => itemIndex !== index) })}>Delete</button>
// //                     </div>
// //                     <div className="mt-3 text-sm text-steel">Selected: {section.question_ids.length} | Available: {questions.length}</div>
// //                     <div className="mt-3 max-h-44 overflow-auto rounded-md border border-line p-2">
// //                       {questions.map((question) => (
// //                         <label key={question.id} className="flex items-center gap-2 border-b border-line py-2 text-sm last:border-b-0">
// //                           <input type="checkbox" checked={section.question_ids.includes(question.id)} onChange={() => toggleQuestion(index, question.id)} />
// //                           <span className="font-medium">{question.question_number ?? question.id}</span>
// //                           <span className="truncate text-steel">{question.question_text}</span>
// //                         </label>
// //                       ))}
// //                     </div>
// //                   </div>
// //                 ))}
// //               </div>
// //             </div>

// //             <div className="rounded-lg border border-line bg-white p-5 shadow-panel">
// //               <h2 className="text-lg font-semibold text-ink">Exam Instructions</h2>
// //               <textarea className="focus-ring mt-3 min-h-48 w-full rounded-md border border-line px-3 py-2 text-sm" value={configuration.test.instructions} onChange={(event) => patchConfig({ ...configuration, test: { ...configuration.test, instructions: event.target.value } })} />
// //             </div>
// //           </div>
// //         </section>
// //       </div>
// //     </main>
// //   );
// // }


// "use client";

// import Link from "next/link";
// import { useEffect, useMemo, useState } from "react";
// import { ErrorMessage } from "@/components/common/ErrorMessage";
// import { Loading } from "@/components/common/Loading";
// import {
//   getConfiguration,
//   getQuestions,
//   saveConfiguration,
//   validateConfiguration,
// } from "@/lib/api";
// import type {
//   ConfigurationValidationResult,
//   Question,
//   TestConfiguration,
//   TestSection,
// } from "@/lib/types";

// function numberValue(value: string): number {
//   const parsed = Number(value);
//   return Number.isFinite(parsed) ? parsed : 0;
// }

// function isNegativeMarking(value: string): boolean {
//   return value.trim().startsWith("-");
// }

// export function ConfigurationClient({ testId }: { testId: string }) {
//   const [configuration, setConfiguration] =
//     useState<TestConfiguration | null>(null);
//   const [questions, setQuestions] = useState<Question[]>([]);
//   const [validation, setValidation] =
//     useState<ConfigurationValidationResult | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [error, setError] = useState("");
//   const [message, setMessage] = useState("");

//   useEffect(() => {
//     async function load() {
//       try {
//         const [config, loadedQuestions] = await Promise.all([
//           getConfiguration(testId),
//           getQuestions(testId),
//         ]);

//         setConfiguration(config);
//         setQuestions(loadedQuestions);
//         setValidation(await validateConfiguration(testId, config));
//       } catch (err) {
//         setError(
//           err instanceof Error
//             ? err.message
//             : "Could not load configuration."
//         );
//       } finally {
//         setLoading(false);
//       }
//     }

//     void load();
//   }, [testId]);

//   const totals = useMemo(() => {
//     if (!configuration) {
//       return {
//         questions: 0,
//         duration: 0,
//         negative: false,
//       };
//     }

//     return {
//       questions: configuration.sections.reduce(
//         (sum, section) => sum + section.question_ids.length,
//         0
//       ),

//       duration:
//         configuration.test.timing.mode === "section"
//           ? configuration.sections.reduce(
//               (sum, section) => sum + section.duration_minutes,
//               0
//             )
//           : configuration.test.timing.total_minutes,

//       negative:
//         configuration.sections.some((section) =>
//           isNegativeMarking(section.marking.wrong)
//         ) ||
//         isNegativeMarking(configuration.test.global_marking.wrong),
//     };
//   }, [configuration]);

//   function patchConfig(next: TestConfiguration) {
//     setConfiguration(next);

//     void validateConfiguration(testId, next)
//       .then(setValidation)
//       .catch(() => undefined);
//   }

//   function updateSection(
//     index: number,
//     update: Partial<TestSection>
//   ) {
//     if (!configuration) return;

//     const sections = [...configuration.sections];

//     sections[index] = {
//       ...sections[index],
//       ...update,
//     };

//     patchConfig({
//       ...configuration,
//       sections,
//     });
//   }

//   function addSection() {
//     if (!configuration) return;

//     const id = `section_${Date.now()}`;

//     patchConfig({
//       ...configuration,
//       sections: [
//         ...configuration.sections,
//         {
//           id,
//           name: "New Section",
//           description: "",
//           duration_minutes: 30,
//           expected_question_count: 0,

//           // Marking values are strings intentionally.
//           // This preserves values such as "-1/3", "-0.33", "1.5", etc.
//           marking: {
//             correct: "1",
//             wrong: "-0.25",
//             unattempted: "0",
//           },

//           question_ids: [],
//           selection_mode: "manual",
//           allow_section_switching: true,
//         },
//       ],
//     });
//   }

//   function duplicateSection(index: number) {
//     if (!configuration) return;

//     const source = configuration.sections[index];

//     const copy = {
//       ...source,
//       id: `section_${Date.now()}`,
//       name: `${source.name} Copy`,
//       question_ids: [...source.question_ids],
//     };

//     const sections = [...configuration.sections];

//     sections.splice(index + 1, 0, copy);

//     patchConfig({
//       ...configuration,
//       sections,
//     });
//   }

//   function moveSection(index: number, direction: -1 | 1) {
//     if (!configuration) return;

//     const target = index + direction;

//     if (
//       target < 0 ||
//       target >= configuration.sections.length
//     ) {
//       return;
//     }

//     const sections = [...configuration.sections];

//     [sections[index], sections[target]] = [
//       sections[target],
//       sections[index],
//     ];

//     patchConfig({
//       ...configuration,
//       sections,
//     });
//   }

//   function toggleQuestion(
//     sectionIndex: number,
//     questionId: string
//   ) {
//     if (!configuration) return;

//     const section = configuration.sections[sectionIndex];

//     const question_ids = section.question_ids.includes(questionId)
//       ? section.question_ids.filter((id) => id !== questionId)
//       : [...section.question_ids, questionId];

//     updateSection(sectionIndex, {
//       question_ids,
//       expected_question_count: question_ids.length,
//       selection_mode: "manual",
//     });
//   }

//   function automaticAssign(index: number) {
//     if (!configuration) return;

//     const section = configuration.sections[index];

//     const question_ids = questions
//       .filter(
//         (question) =>
//           (question.section || "General") === section.name
//       )
//       .map((question) => question.id);

//     updateSection(index, {
//       question_ids,
//       expected_question_count: question_ids.length,
//       selection_mode: "automatic",
//     });
//   }

//   async function save() {
//     if (!configuration) return;

//     setSaving(true);
//     setError("");
//     setMessage("");

//     try {
//       const result = await validateConfiguration(
//         testId,
//         configuration
//       );

//       setValidation(result);

//       if (!result.valid) return;

//       const saved = await saveConfiguration(
//         testId,
//         configuration
//       );

//       setConfiguration(saved);
//       setMessage("Configuration saved.");
//     } catch (err) {
//       setError(
//         err instanceof Error
//           ? err.message
//           : "Configuration save failed."
//       );
//     } finally {
//       setSaving(false);
//     }
//   }

//   if (loading) {
//     return (
//       <main className="min-h-screen bg-[#f7f8fb] p-5">
//         <Loading label="Loading configuration" />
//       </main>
//     );
//   }

//   if (!configuration) {
//     return (
//       <main className="min-h-screen bg-[#f7f8fb] p-5">
//         <ErrorMessage
//           message={error || "Configuration unavailable."}
//         />
//       </main>
//     );
//   }

//   return (
//     <main className="min-h-screen bg-[#f7f8fb] px-4 py-5">
//       <div className="mx-auto max-w-7xl space-y-5">
//         <header className="rounded-lg border border-line bg-white p-5 shadow-panel">
//           <div className="flex flex-wrap items-start justify-between gap-4">
//             <div>
//               <div className="text-sm font-semibold uppercase text-accent">
//                 CBT Forge
//               </div>

//               <h1 className="mt-1 text-2xl font-semibold text-ink">
//                 Test Configuration
//               </h1>

//               <p className="mt-1 text-sm text-steel">
//                 Configure timing, marking, navigation, sections,
//                 and question assignment for Phase 3.
//               </p>
//             </div>

//             <div className="flex flex-wrap gap-2">
//               <Link
//                 className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-ink"
//                 href={`/review/${testId}`}
//               >
//                 Back to Review
//               </Link>

//               <Link
//                 className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-forge"
//                 href={`/configure/${testId}/preview`}
//               >
//                 Preview Test
//               </Link>

//               <button
//                 className="rounded-md bg-forge px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
//                 onClick={save}
//                 disabled={saving || validation?.valid === false}
//               >
//                 Save Configuration
//               </button>
//             </div>
//           </div>

//           <div className="mt-5 grid gap-3 md:grid-cols-6">
//             {[
//               ["Questions", totals.questions],
//               ["Sections", configuration.sections.length],
//               ["Duration", `${totals.duration} min`],
//               [
//                 "Switching",
//                 configuration.test.navigation.section_switching
//                   ? "Allowed"
//                   : "Blocked",
//               ],
//               [
//                 "Negative",
//                 totals.negative ? "Enabled" : "Disabled",
//               ],
//               [
//                 "Auto-submit",
//                 configuration.test.behavior.auto_submit
//                   ? "On"
//                   : "Off",
//               ],
//             ].map(([label, value]) => (
//               <div
//                 key={label}
//                 className="rounded-md border border-line bg-[#fafbfc] p-3"
//               >
//                 <div className="text-xs uppercase text-steel">
//                   {label}
//                 </div>

//                 <div className="mt-1 font-semibold text-ink">
//                   {value}
//                 </div>
//               </div>
//             ))}
//           </div>
//         </header>

//         {error ? <ErrorMessage message={error} /> : null}

//         {message ? (
//           <div className="rounded-md border border-line bg-white px-4 py-3 text-sm text-steel">
//             {message}
//           </div>
//         ) : null}

//         {validation ? (
//           <div className="rounded-lg border border-line bg-white p-4 shadow-panel">
//             <div className="font-semibold text-ink">
//               Configuration Validation
//             </div>

//             <div className="mt-2 grid gap-2 text-sm">
//               {validation.errors.map((item) => (
//                 <div
//                   key={item}
//                   className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700"
//                 >
//                   {item}
//                 </div>
//               ))}

//               {validation.warnings.map((item) => (
//                 <div
//                   key={item}
//                   className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800"
//                 >
//                   {item}
//                 </div>
//               ))}

//               {!validation.errors.length &&
//               !validation.warnings.length ? (
//                 <div className="text-green-700">
//                   Configuration is valid.
//                 </div>
//               ) : null}
//             </div>
//           </div>
//         ) : null}

//         <section className="grid gap-5 lg:grid-cols-[420px_1fr]">
//           <div className="space-y-5">
//             <div className="rounded-lg border border-line bg-white p-5 shadow-panel">
//               <h2 className="text-lg font-semibold text-ink">
//                 Test Information
//               </h2>

//               <div className="mt-4 grid gap-3">
//                 <label className="block">
//                   <span className="mb-1 block text-xs font-semibold uppercase text-steel">
//                     Test Name
//                   </span>

//                   <input
//                     className="focus-ring w-full rounded-md border border-line px-3 py-2 text-sm"
//                     value={configuration.test.title}
//                     onChange={(event) =>
//                       patchConfig({
//                         ...configuration,
//                         test: {
//                           ...configuration.test,
//                           title: event.target.value,
//                         },
//                       })
//                     }
//                   />
//                 </label>

//                 <label className="block">
//                   <span className="mb-1 block text-xs font-semibold uppercase text-steel">
//                     Description
//                   </span>

//                   <textarea
//                     className="focus-ring min-h-20 w-full rounded-md border border-line px-3 py-2 text-sm"
//                     value={configuration.test.description}
//                     onChange={(event) =>
//                       patchConfig({
//                         ...configuration,
//                         test: {
//                           ...configuration.test,
//                           description: event.target.value,
//                         },
//                       })
//                     }
//                   />
//                 </label>

//                 <label className="block">
//                   <span className="mb-1 block text-xs font-semibold uppercase text-steel">
//                     Optional Test ID
//                   </span>

//                   <input
//                     className="focus-ring w-full rounded-md border border-line px-3 py-2 text-sm"
//                     value={configuration.test.id}
//                     readOnly
//                   />
//                 </label>
//               </div>
//             </div>

//             <div className="rounded-lg border border-line bg-white p-5 shadow-panel">
//               <h2 className="text-lg font-semibold text-ink">
//                 Timing
//               </h2>

//               <div className="mt-4 space-y-3 text-sm">
//                 <label className="flex items-center gap-2">
//                   <input
//                     type="radio"
//                     checked={
//                       configuration.test.timing.mode === "single"
//                     }
//                     onChange={() =>
//                       patchConfig({
//                         ...configuration,
//                         test: {
//                           ...configuration.test,
//                           timing: {
//                             ...configuration.test.timing,
//                             mode: "single",
//                           },
//                         },
//                       })
//                     }
//                   />

//                   One timer for entire test
//                 </label>

//                 <label className="flex items-center gap-2">
//                   <input
//                     type="radio"
//                     checked={
//                       configuration.test.timing.mode === "section"
//                     }
//                     onChange={() =>
//                       patchConfig({
//                         ...configuration,
//                         test: {
//                           ...configuration.test,
//                           timing: {
//                             ...configuration.test.timing,
//                             mode: "section",
//                             total_minutes:
//                               configuration.sections.reduce(
//                                 (sum, section) =>
//                                   sum + section.duration_minutes,
//                                 0
//                               ),
//                           },
//                         },
//                       })
//                     }
//                   />

//                   Separate timer for each section
//                 </label>

//                 <label className="block">
//                   <span className="mb-1 block text-xs font-semibold uppercase text-steel">
//                     Total duration
//                   </span>

//                   <input
//                     type="number"
//                     min={1}
//                     className="focus-ring w-full rounded-md border border-line px-3 py-2"
//                     value={
//                       configuration.test.timing.total_minutes
//                     }
//                     onChange={(event) =>
//                       patchConfig({
//                         ...configuration,
//                         test: {
//                           ...configuration.test,
//                           timing: {
//                             ...configuration.test.timing,
//                             total_minutes: numberValue(
//                               event.target.value
//                             ),
//                           },
//                         },
//                       })
//                     }
//                   />
//                 </label>

//                 <div className="text-steel">
//                   Total Test Time: {totals.duration} minutes
//                 </div>
//               </div>
//             </div>

//             <div className="rounded-lg border border-line bg-white p-5 shadow-panel">
//               <h2 className="text-lg font-semibold text-ink">
//                 Navigation &amp; Behavior
//               </h2>

//               <div className="mt-4 grid gap-2 text-sm">
//                 {[
//                   [
//                     "section_switching",
//                     "Allow switching between sections",
//                   ],
//                   [
//                     "back_navigation",
//                     "Allow Back Navigation",
//                   ],
//                   [
//                     "previous_question",
//                     "Allow Previous Question",
//                   ],
//                   [
//                     "next_question",
//                     "Allow Next Question",
//                   ],
//                   [
//                     "clear_response",
//                     "Allow Clear Response",
//                   ],
//                   [
//                     "mark_for_review",
//                     "Allow Mark for Review",
//                   ],
//                   [
//                     "question_palette",
//                     "Allow Question Palette",
//                   ],
//                 ].map(([key, label]) => (
//                   <label
//                     key={key}
//                     className="flex items-center gap-2"
//                   >
//                     <input
//                       type="checkbox"
//                       checked={Boolean(
//                         configuration.test.navigation[
//                           key as keyof typeof configuration.test.navigation
//                         ]
//                       )}
//                       onChange={(event) =>
//                         patchConfig({
//                           ...configuration,
//                           test: {
//                             ...configuration.test,
//                             navigation: {
//                               ...configuration.test.navigation,
//                               [key]: event.target.checked,
//                             },
//                           },
//                         })
//                       }
//                     />

//                     {label}
//                   </label>
//                 ))}

//                 <label className="flex items-center gap-2">
//                   <input
//                     type="checkbox"
//                     checked={
//                       configuration.test.behavior.shuffle_questions
//                     }
//                     onChange={(event) =>
//                       patchConfig({
//                         ...configuration,
//                         test: {
//                           ...configuration.test,
//                           behavior: {
//                             ...configuration.test.behavior,
//                             shuffle_questions:
//                               event.target.checked,
//                           },
//                         },
//                       })
//                     }
//                   />

//                   Shuffle Questions
//                 </label>

//                 <label className="flex items-center gap-2">
//                   <input
//                     type="checkbox"
//                     checked={
//                       configuration.test.behavior.shuffle_options
//                     }
//                     onChange={(event) =>
//                       patchConfig({
//                         ...configuration,
//                         test: {
//                           ...configuration.test,
//                           behavior: {
//                             ...configuration.test.behavior,
//                             shuffle_options:
//                               event.target.checked,
//                           },
//                         },
//                       })
//                     }
//                   />

//                   Shuffle Options
//                 </label>

//                 <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
//                   Shuffling changes question order during the
//                   test. Question IDs remain unchanged.
//                 </div>

//                 <label className="flex items-center gap-2">
//                   <input
//                     type="checkbox"
//                     checked={
//                       configuration.test.behavior.auto_submit
//                     }
//                     onChange={(event) =>
//                       patchConfig({
//                         ...configuration,
//                         test: {
//                           ...configuration.test,
//                           behavior: {
//                             ...configuration.test.behavior,
//                             auto_submit: event.target.checked,
//                           },
//                         },
//                       })
//                     }
//                   />

//                   Auto-submit when timer expires
//                 </label>
//               </div>
//             </div>
//           </div>

//           <div className="space-y-5">
//             <div className="rounded-lg border border-line bg-white p-5 shadow-panel">
//               <div className="flex items-center justify-between gap-3">
//                 <h2 className="text-lg font-semibold text-ink">
//                   Sections
//                 </h2>

//                 <button
//                   className="rounded-md bg-forge px-3 py-2 text-sm font-semibold text-white"
//                   onClick={addSection}
//                 >
//                   Add Section
//                 </button>
//               </div>

//               <div className="mt-4 space-y-4">
//                 {configuration.sections.map((section, index) => (
//                   <div
//                     key={section.id}
//                     className="rounded-md border border-line p-4"
//                   >
//                     <div className="grid gap-3 md:grid-cols-2">
//                       <label>
//                         <span className="mb-1 block text-xs font-semibold uppercase text-steel">
//                           Name
//                         </span>

//                         <input
//                           className="focus-ring w-full rounded-md border border-line px-3 py-2 text-sm"
//                           value={section.name}
//                           onChange={(event) =>
//                             updateSection(index, {
//                               name: event.target.value,
//                             })
//                           }
//                         />
//                       </label>

//                       <label>
//                         <span className="mb-1 block text-xs font-semibold uppercase text-steel">
//                           Time limit
//                         </span>

//                         <input
//                           type="number"
//                           min={1}
//                           className="focus-ring w-full rounded-md border border-line px-3 py-2 text-sm"
//                           value={section.duration_minutes}
//                           onChange={(event) =>
//                             updateSection(index, {
//                               duration_minutes: numberValue(
//                                 event.target.value
//                               ),
//                             })
//                           }
//                         />
//                       </label>

//                       {/* Correct marking */}
//                       <label>
//                         <span className="mb-1 block text-xs font-semibold uppercase text-steel">
//                           Correct
//                         </span>

//                         <input
//                           type="text"
//                           inputMode="decimal"
//                           className="focus-ring w-full rounded-md border border-line px-3 py-2 text-sm"
//                           placeholder="e.g. 1 or 1.5"
//                           value={section.marking.correct}
//                           onChange={(event) =>
//                             updateSection(index, {
//                               marking: {
//                                 ...section.marking,
//                                 correct: event.target.value,
//                               },
//                             })
//                           }
//                         />
//                       </label>

//                       {/* Wrong marking */}
//                       <label>
//                         <span className="mb-1 block text-xs font-semibold uppercase text-steel">
//                           Wrong
//                         </span>

//                         <input
//                           type="text"
//                           inputMode="decimal"
//                           className="focus-ring w-full rounded-md border border-line px-3 py-2 text-sm"
//                           placeholder="e.g. -0.33 or -1/3"
//                           value={section.marking.wrong}
//                           onChange={(event) =>
//                             updateSection(index, {
//                               marking: {
//                                 ...section.marking,
//                                 wrong: event.target.value,
//                               },
//                             })
//                           }
//                         />
//                       </label>

//                       {/* Unattempted marking */}
//                       <label>
//                         <span className="mb-1 block text-xs font-semibold uppercase text-steel">
//                           Unattempted
//                         </span>

//                         <input
//                           type="text"
//                           inputMode="decimal"
//                           className="focus-ring w-full rounded-md border border-line px-3 py-2 text-sm"
//                           placeholder="e.g. 0"
//                           value={section.marking.unattempted}
//                           onChange={(event) =>
//                             updateSection(index, {
//                               marking: {
//                                 ...section.marking,
//                                 unattempted:
//                                   event.target.value,
//                               },
//                             })
//                           }
//                         />
//                       </label>

//                       <label>
//                         <span className="mb-1 block text-xs font-semibold uppercase text-steel">
//                           Expected questions
//                         </span>

//                         <input
//                           type="number"
//                           min={0}
//                           className="focus-ring w-full rounded-md border border-line px-3 py-2 text-sm"
//                           value={
//                             section.expected_question_count ??
//                             section.question_ids.length
//                           }
//                           onChange={(event) =>
//                             updateSection(index, {
//                               expected_question_count:
//                                 numberValue(
//                                   event.target.value
//                                 ),
//                             })
//                           }
//                         />
//                       </label>
//                     </div>

//                     <textarea
//                       className="focus-ring mt-3 min-h-16 w-full rounded-md border border-line px-3 py-2 text-sm"
//                       placeholder="Section description"
//                       value={section.description}
//                       onChange={(event) =>
//                         updateSection(index, {
//                           description: event.target.value,
//                         })
//                       }
//                     />

//                     <div className="mt-3 flex flex-wrap gap-2">
//                       <button
//                         className="rounded-md border border-line px-3 py-2 text-sm font-medium text-ink"
//                         onClick={() => automaticAssign(index)}
//                       >
//                         Automatic Assign
//                       </button>

//                       <button
//                         className="rounded-md border border-line px-3 py-2 text-sm font-medium text-ink"
//                         onClick={() => duplicateSection(index)}
//                       >
//                         Duplicate
//                       </button>

//                       <button
//                         className="rounded-md border border-line px-3 py-2 text-sm font-medium text-ink"
//                         onClick={() =>
//                           moveSection(index, -1)
//                         }
//                       >
//                         Move Up
//                       </button>

//                       <button
//                         className="rounded-md border border-line px-3 py-2 text-sm font-medium text-ink"
//                         onClick={() =>
//                           moveSection(index, 1)
//                         }
//                       >
//                         Move Down
//                       </button>

//                       <button
//                         className="rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700"
//                         onClick={() =>
//                           patchConfig({
//                             ...configuration,
//                             sections:
//                               configuration.sections.filter(
//                                 (_, itemIndex) =>
//                                   itemIndex !== index
//                               ),
//                           })
//                         }
//                       >
//                         Delete
//                       </button>
//                     </div>

//                     <div className="mt-3 text-sm text-steel">
//                       Selected: {section.question_ids.length} |
//                       Available: {questions.length}
//                     </div>

//                     <div className="mt-3 max-h-44 overflow-auto rounded-md border border-line p-2">
//                       {questions.map((question) => (
//                         <label
//                           key={question.id}
//                           className="flex items-center gap-2 border-b border-line py-2 text-sm last:border-b-0"
//                         >
//                           <input
//                             type="checkbox"
//                             checked={section.question_ids.includes(
//                               question.id
//                             )}
//                             onChange={() =>
//                               toggleQuestion(
//                                 index,
//                                 question.id
//                               )
//                             }
//                           />

//                           <span className="font-medium">
//                             {question.question_number ??
//                               question.id}
//                           </span>

//                           <span className="truncate text-steel">
//                             {question.question_text}
//                           </span>
//                         </label>
//                       ))}
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>

//             <div className="rounded-lg border border-line bg-white p-5 shadow-panel">
//               <h2 className="text-lg font-semibold text-ink">
//                 Exam Instructions
//               </h2>

//               <textarea
//                 className="focus-ring mt-3 min-h-48 w-full rounded-md border border-line px-3 py-2 text-sm"
//                 value={configuration.test.instructions}
//                 onChange={(event) =>
//                   patchConfig({
//                     ...configuration,
//                     test: {
//                       ...configuration.test,
//                       instructions: event.target.value,
//                     },
//                   })
//                 }
//               />
//             </div>
//           </div>
//         </section>
//       </div>
//     </main>
//   );
// }


"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getConfiguration,getQuestions,saveConfiguration,validateConfiguration } from "@/lib/api";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { Loading } from "@/components/common/Loading";
import type { ConfigurationValidationResult,Question,TestConfiguration,TestSection } from "@/lib/types";

const n=(v:string)=>Number.isFinite(Number(v))?Number(v):0;
const negative=(v:string)=>String(v).trim().startsWith("-");

export function ConfigurationClient({testId}:{testId:string}){
 const [configuration,setConfiguration]=useState<TestConfiguration|null>(null),[questions,setQuestions]=useState<Question[]>([]),[validation,setValidation]=useState<ConfigurationValidationResult|null>(null);
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
 useEffect(()=>{void load();},[testId]);
 async function load(){try{const[c,q]=await Promise.all([getConfiguration(testId),getQuestions(testId)]);setConfiguration(c);setQuestions(q);setValidation(await validateConfiguration(testId,c));}catch(e){setError(e instanceof Error?e.message:"Could not load configuration.");}finally{setLoading(false);}}
 function patch(c:TestConfiguration){setConfiguration(c);void validateConfiguration(testId,c).then(setValidation).catch(()=>{});}
 function section(i:number,u:Partial<TestSection>){if(!configuration)return;const s=[...configuration.sections];s[i]={...s[i],...u};patch({...configuration,sections:s});}
 function toggle(i:number,id:string){const s=configuration!.sections[i];const ids=s.question_ids.includes(id)?s.question_ids.filter(x=>x!==id):[...s.question_ids,id];section(i,{question_ids:ids,expected_question_count:ids.length,selection_mode:"manual"});}
 function add(){if(!configuration)return;patch({...configuration,sections:[...configuration.sections,{id:`section_${Date.now()}`,name:"New Section",description:"",duration_minutes:30,expected_question_count:0,marking:{correct:"1",wrong:"-0.25",unattempted:"0"},question_ids:[],selection_mode:"manual",allow_section_switching:true}]});}
 async function save(){if(!configuration)return;setSaving(true);setError("");try{const v=await validateConfiguration(testId,configuration);setValidation(v);if(!v.valid)return;setConfiguration(await saveConfiguration(testId,configuration));setMessage("Configuration saved.");}catch(e){setError(e instanceof Error?e.message:"Configuration save failed.");}finally{setSaving(false);}}
 const totals=useMemo(()=>configuration?{questions:configuration.sections.reduce((a,s)=>a+s.question_ids.length,0),duration:configuration.test.timing.mode==="section"?configuration.sections.reduce((a,s)=>a+s.duration_minutes,0):configuration.test.timing.total_minutes,negative:configuration.sections.some(s=>negative(s.marking.wrong))||negative(configuration.test.global_marking.wrong)}:{questions:0,duration:0,negative:false},[configuration]);
 if(loading)return <main className="p-5"><Loading label="Loading configuration"/></main>;
 if(!configuration)return <main className="p-5"><ErrorMessage message={error||"Configuration unavailable."}/></main>;
 return <main className="min-h-screen bg-[#f7f8fb] px-4 py-5"><div className="mx-auto max-w-7xl space-y-5">
  <header className="rounded-lg border border-line bg-white p-5 shadow-panel"><div className="flex flex-wrap justify-between gap-3"><div><div className="text-sm font-semibold uppercase text-accent">CBT Forge</div><h1 className="text-2xl font-semibold">Test Configuration</h1></div><div className="flex gap-2"><Link className="rounded border border-line px-3 py-2 text-sm" href={`/review/${testId}`}>Review</Link><Link className="rounded border border-line px-3 py-2 text-sm" href={`/configure/${testId}/preview`}>Preview</Link><button className="rounded bg-forge px-4 py-2 text-sm text-white disabled:opacity-50" disabled={saving||validation?.valid===false} onClick={()=>void save()}>Save Configuration</button></div></div>
   <div className="mt-4 grid gap-3 md:grid-cols-5"><Stat label="Questions" value={totals.questions}/><Stat label="Sections" value={configuration.sections.length}/><Stat label="Duration" value={`${totals.duration} min`}/><Stat label="Negative" value={totals.negative?"Enabled":"Disabled"}/><Stat label="Auto-submit" value={configuration.test.behavior.auto_submit?"On":"Off"}/></div>
  </header>
  {error&&<ErrorMessage message={error}/>} {message&&<div className="rounded border border-line bg-white p-3 text-sm">{message}</div>}
  {validation&&<div className="rounded-lg border border-line bg-white p-4"><div className="font-semibold">Validation</div>{validation.errors.map(x=><div key={x} className="mt-2 rounded bg-red-50 p-2 text-sm text-red-700">{x}</div>)}{validation.warnings.map(x=><div key={x} className="mt-2 rounded bg-amber-50 p-2 text-sm text-amber-800">{x}</div>)}{!validation.errors.length&&!validation.warnings.length&&<div className="mt-2 text-sm text-green-700">Configuration is valid.</div>}</div>}
  <div className="grid gap-5 lg:grid-cols-[390px_1fr]">
   <section className="space-y-5">
    <div className="rounded-lg border border-line bg-white p-5"><h2 className="font-semibold">Test Information</h2><Field label="Test Name"><input className={input} value={configuration.test.title} onChange={e=>patch({...configuration,test:{...configuration.test,title:e.target.value}})}/></Field><Field label="Description"><textarea className={`${input} min-h-20`} value={configuration.test.description} onChange={e=>patch({...configuration,test:{...configuration.test,description:e.target.value}})}/></Field></div>
    <div className="rounded-lg border border-line bg-white p-5"><h2 className="font-semibold">Timing</h2><div className="mt-3 grid gap-2 text-sm"><label><input type="radio" checked={configuration.test.timing.mode==="single"} onChange={()=>patch({...configuration,test:{...configuration.test,timing:{...configuration.test.timing,mode:"single"}}})}/> One timer</label><label><input type="radio" checked={configuration.test.timing.mode==="section"} onChange={()=>patch({...configuration,test:{...configuration.test,timing:{...configuration.test.timing,mode:"section"}}})}/> Section timers</label><Field label="Total duration (minutes)"><input className={input} type="number" min="1" value={configuration.test.timing.total_minutes} onChange={e=>patch({...configuration,test:{...configuration.test,timing:{...configuration.test.timing,total_minutes:n(e.target.value)}}})}/></Field></div></div>
    <div className="rounded-lg border border-line bg-white p-5"><h2 className="font-semibold">Navigation & Behavior</h2><div className="mt-3 grid gap-2 text-sm">{(["section_switching","back_navigation","previous_question","next_question","clear_response","mark_for_review","question_palette"] as const).map(k=><label key={k}><input type="checkbox" checked={Boolean(configuration.test.navigation[k])} onChange={e=>patch({...configuration,test:{...configuration.test,navigation:{...configuration.test.navigation,[k]:e.target.checked}}})}/> {k.replaceAll("_"," ")}</label>)}<label><input type="checkbox" checked={configuration.test.behavior.shuffle_questions} onChange={e=>patch({...configuration,test:{...configuration.test,behavior:{...configuration.test.behavior,shuffle_questions:e.target.checked}}})}/> Shuffle questions</label><label><input type="checkbox" checked={configuration.test.behavior.shuffle_options} onChange={e=>patch({...configuration,test:{...configuration.test,behavior:{...configuration.test.behavior,shuffle_options:e.target.checked}}})}/> Shuffle options</label><label><input type="checkbox" checked={configuration.test.behavior.auto_submit} onChange={e=>patch({...configuration,test:{...configuration.test,behavior:{...configuration.test.behavior,auto_submit:e.target.checked}}})}/> Auto-submit</label></div></div>
   </section>
   <section className="space-y-5"><div className="rounded-lg border border-line bg-white p-5"><div className="flex justify-between"><h2 className="font-semibold">Sections</h2><button className="rounded bg-forge px-3 py-2 text-sm text-white" onClick={add}>Add Section</button></div>
    {configuration.sections.map((s,i)=><div key={s.id} className="mt-4 rounded border border-line p-4"><div className="grid gap-3 md:grid-cols-2"><Field label="Name"><input className={input} value={s.name} onChange={e=>section(i,{name:e.target.value})}/></Field><Field label="Time limit"><input className={input} type="number" min="1" value={s.duration_minutes} onChange={e=>section(i,{duration_minutes:n(e.target.value)})}/></Field><Field label="Correct marks"><input className={input} value={s.marking.correct} onChange={e=>section(i,{marking:{...s.marking,correct:e.target.value}})}/></Field><Field label="Incorrect marks"><input className={input} value={s.marking.wrong} onChange={e=>section(i,{marking:{...s.marking,wrong:e.target.value}})}/></Field><Field label="Unattempted marks"><input className={input} value={s.marking.unattempted} onChange={e=>section(i,{marking:{...s.marking,unattempted:e.target.value}})}/></Field><Field label="Expected questions"><input className={input} type="number" min="0" value={s.expected_question_count??s.question_ids.length} onChange={e=>section(i,{expected_question_count:n(e.target.value)})}/></Field></div><textarea className={`${input} mt-3 min-h-16`} value={s.description} onChange={e=>section(i,{description:e.target.value})}/><div className="mt-3 text-xs text-steel">Selected {s.question_ids.length} / {questions.length}</div><div className="mt-2 max-h-56 overflow-auto rounded border border-line">{questions.map(q=><label key={q.id} className="flex items-center gap-2 border-b border-line p-2 text-sm"><input type="checkbox" checked={s.question_ids.includes(q.id)} onChange={()=>toggle(i,q.id)}/><b>{q.question_number??q.id}</b><span className="truncate">{q.question_text}</span></label>)}</div></div>)}
   </div><div className="rounded-lg border border-line bg-white p-5"><h2 className="font-semibold">Exam Instructions</h2><textarea className={`${input} mt-3 min-h-48`} value={configuration.test.instructions} onChange={e=>patch({...configuration,test:{...configuration.test,instructions:e.target.value}})}/></div></section>
  </div>
 </div></main>
}
const input="focus-ring w-full rounded-md border border-line px-3 py-2 text-sm";
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="mt-3 block"><span className="mb-1 block text-xs font-semibold uppercase text-steel">{label}</span>{children}</label>}
function Stat({label,value}:{label:string;value:string|number}){return <div className="rounded border border-line bg-[#fafbfc] p-3"><div className="text-xs uppercase text-steel">{label}</div><div className="font-semibold">{value}</div></div>}
