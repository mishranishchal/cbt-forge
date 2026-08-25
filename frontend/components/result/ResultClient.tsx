// // // "use client";

// // // import Link from "next/link";
// // // import { useEffect, useMemo, useState } from "react";
// // // import { ErrorMessage } from "@/components/common/ErrorMessage";
// // // import { Loading } from "@/components/common/Loading";
// // // import { exportUrl, generateAiAnalysis, generateExplanation, getResult, imageUrl, retakeAttempt } from "@/lib/api";
// // // import type { QuestionResult, ResultPayload } from "@/lib/types";
// // // import { useRouter } from "next/navigation";

// // // type ReviewFilter = "all" | "correct" | "wrong" | "unattempted" | "marked" | "weak";

// // // function pct(value: number) {
// // //   return `${Number(value || 0).toFixed(2)}%`;
// // // }

// // // function score(value: number) {
// // //   return Number(value || 0).toFixed(2);
// // // }

// // // export function ResultClient({ attemptId }: { attemptId: string }) {
// // //   const router = useRouter();
// // //   const [result, setResult] = useState<ResultPayload | null>(null);
// // //   const [error, setError] = useState("");
// // //   const [loading, setLoading] = useState(true);
// // //   const [aiLoading, setAiLoading] = useState(false);
// // //   const [aiAnalysis, setAiAnalysis] = useState<Record<string, unknown> | null>(null);
// // //   const [filter, setFilter] = useState<ReviewFilter>("all");
// // //   const [section, setSection] = useState("");
// // //   const [topic, setTopic] = useState("");
// // //   const [search, setSearch] = useState("");
// // //   const [explanationMessages, setExplanationMessages] = useState<Record<string, string>>({});

// // //   useEffect(() => {
// // //     async function load() {
// // //       try {
// // //         const payload = await getResult(attemptId);
// // //         setResult(payload);
// // //         setAiAnalysis(payload.ai_analysis);
// // //       } catch (err) {
// // //         setError(err instanceof Error ? err.message : "Unable to load result.");
// // //       } finally {
// // //         setLoading(false);
// // //       }
// // //     }
// // //     void load();
// // //   }, [attemptId]);

// // //   const questionById = useMemo(() => new Map((result?.questions ?? []).map((question) => [question.id, question])), [result]);
// // //   const weakTopics = new Set(result?.analytics.weaknesses.map((item) => item.name) ?? []);
// // //   const sections = result?.configuration.sections ?? [];
// // //   const topics = Array.from(new Set(result?.questions.map((question) => question.topic).filter(Boolean) as string[])).sort();

// // //   const visibleQuestions = useMemo(() => {
// // //     if (!result) return [];
// // //     const q = search.trim().toLowerCase();
// // //     return result.scoring.question_results.filter((row) => {
// // //       const question = questionById.get(row.question_id);
// // //       const sectionName = sections.find((item) => item.id === row.section_id)?.name ?? "";
// // //       const haystack = [row.question_number, question?.question_text, question?.topic, question?.section].join(" ").toLowerCase();
// // //       if (q && !haystack.includes(q)) return false;
// // //       if (filter !== "all") {
// // //         if (filter === "marked" && !row.marked_for_review) return false;
// // //         if (filter === "weak" && !weakTopics.has(row.topic ?? "")) return false;
// // //         if (["correct", "wrong", "unattempted"].includes(filter) && row.status !== filter) return false;
// // //       }
// // //       if (section && sectionName !== section) return false;
// // //       if (topic && row.topic !== topic) return false;
// // //       return true;
// // //     });
// // //   }, [result, search, filter, section, topic, questionById, sections, weakTopics]);

// // //   async function generateReview() {
// // //     setAiLoading(true);
// // //     setError("");
// // //     try {
// // //       const analysis = await generateAiAnalysis(attemptId);
// // //       setAiAnalysis(analysis);
// // //     } catch (err) {
// // //       setError(err instanceof Error ? err.message : "AI analysis is temporarily unavailable.");
// // //     } finally {
// // //       setAiLoading(false);
// // //     }
// // //   }

// // //   async function explain(questionId: string) {
// // //     setExplanationMessages((current) => ({ ...current, [questionId]: "Generating explanation..." }));
// // //     try {
// // //       const generated = await generateExplanation(questionId);
// // //       setExplanationMessages((current) => ({
// // //         ...current,
// // //         [questionId]: `AI-generated explanation: ${String(generated.concept || "")} ${String(generated.steps || "")} Final answer: ${String(generated.final_answer || "")}`
// // //       }));
// // //     } catch (err) {
// // //       setExplanationMessages((current) => ({ ...current, [questionId]: err instanceof Error ? err.message : "AI explanation is temporarily unavailable." }));
// // //     }
// // //   }

// // //   async function retake() {
// // //     const attempt = await retakeAttempt(attemptId);
// // //     router.push(`/test/${attempt.test_id}`);
// // //   }

// // //   if (loading) return <main className="min-h-screen bg-[#f7f8fb] p-5"><Loading label="Loading result" /></main>;
// // //   if (!result) return <main className="min-h-screen bg-[#f7f8fb] p-5"><ErrorMessage message={error || "Result not found."} /></main>;

// // //   const display = result.analytics.display;
// // //   const summary = [
// // //     ["Total Questions", result.scoring.total_questions],
// // //     ["Attempted", result.scoring.attempted],
// // //     ["Correct", result.scoring.correct],
// // //     ["Wrong", result.scoring.wrong],
// // //     ["Unattempted", result.scoring.unattempted],
// // //     ["Score", `${score(result.scoring.score)} / ${score(result.scoring.maximum_score)}`],
// // //     ["Accuracy", pct(result.scoring.accuracy)],
// // //     ["Time Used", `${Math.floor(result.time_used_seconds / 60)}m ${result.time_used_seconds % 60}s`]
// // //   ];

// // //   return (
// // //     <main className="min-h-screen bg-[#f7f8fb] px-4 py-5">
// // //       <div className="mx-auto max-w-7xl space-y-5">
// // //         <header className="rounded-lg border border-line bg-white p-5 shadow-panel">
// // //           <div className="flex flex-wrap items-start justify-between gap-4">
// // //             <div>
// // //               <div className="text-sm font-semibold uppercase text-green-700">TEST COMPLETED</div>
// // //               <h1 className="mt-1 text-3xl font-semibold text-ink">{result.configuration.test.title}</h1>
// // //               <p className="mt-2 text-lg text-steel">Score: <span className="font-semibold text-ink">{display.score} / {display.maximum_score}</span> | Percentage: {display.percentage}% | Accuracy: {display.accuracy}%</p>
// // //             </div>
// // //             <div className="flex flex-wrap gap-2">
// // //               <button className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-ink" onClick={retake}>Retake Test</button>
// // //               <a className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-ink" href={exportUrl(attemptId, "json")}>Download JSON</a>
// // //               <a className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-ink" href={exportUrl(attemptId, "html")}>Download HTML</a>
// // //               <a className="rounded-md bg-forge px-4 py-2 text-sm font-semibold text-white" href={exportUrl(attemptId, "pdf")}>Download PDF</a>
// // //               <Link className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-ink" href="/history">History</Link>
// // //             </div>
// // //           </div>
// // //         </header>

// // //         {error ? <ErrorMessage message={error} /> : null}

// // //         <section className="grid gap-3 md:grid-cols-4">
// // //           {summary.map(([label, value]) => (
// // //             <div key={label} className="rounded-lg border border-line bg-white p-4 shadow-panel">
// // //               <div className="text-xs uppercase text-steel">{label}</div>
// // //               <div className="mt-1 text-xl font-semibold text-ink">{value}</div>
// // //             </div>
// // //           ))}
// // //         </section>

// // //         <section className="grid gap-5 lg:grid-cols-2">
// // //           <div className="rounded-lg border border-line bg-white p-5 shadow-panel">
// // //             <h2 className="text-lg font-semibold text-ink">Section Analysis</h2>
// // //             <div className="mt-4 overflow-auto">
// // //               <table className="w-full text-left text-sm">
// // //                 <thead className="text-xs uppercase text-steel"><tr>{["Section", "Questions", "Attempted", "Correct", "Wrong", "Unattempted", "Score", "Accuracy"].map((h) => <th key={h} className="border-b border-line py-2">{h}</th>)}</tr></thead>
// // //                 <tbody>{result.analytics.section_analysis.map((item) => <tr key={item.name}><td className="border-b border-line py-2">{item.name}</td><td>{item.questions}</td><td>{item.attempted}</td><td>{item.correct}</td><td>{item.wrong}</td><td>{item.unattempted}</td><td>{score(item.score)}</td><td>{pct(item.accuracy)}</td></tr>)}</tbody>
// // //               </table>
// // //             </div>
// // //           </div>
// // //           <div className="rounded-lg border border-line bg-white p-5 shadow-panel">
// // //             <h2 className="text-lg font-semibold text-ink">Section Comparison</h2>
// // //             <div className="mt-4 space-y-3">
// // //               {result.analytics.section_analysis.map((item) => (
// // //                 <button key={item.name} className="block w-full text-left" onClick={() => setSection(item.name)}>
// // //                   <div className="flex justify-between text-sm"><span>{item.name}</span><span>{pct(item.accuracy)}</span></div>
// // //                   <div className="mt-1 h-3 rounded bg-slate-100"><div className="h-3 rounded bg-forge" style={{ width: `${Math.min(100, item.accuracy)}%` }} /></div>
// // //                 </button>
// // //               ))}
// // //             </div>
// // //           </div>
// // //         </section>

// // //         <section className="grid gap-5 lg:grid-cols-3">
// // //           <div className="rounded-lg border border-line bg-white p-5 shadow-panel lg:col-span-2">
// // //             <h2 className="text-lg font-semibold text-ink">Topic Analysis</h2>
// // //             <div className="mt-4 grid gap-3 md:grid-cols-2">
// // //               {result.analytics.topic_analysis.map((item) => (
// // //                 <button key={item.name} className="rounded-md border border-line p-3 text-left" onClick={() => setTopic(item.name)}>
// // //                   <div className="flex justify-between text-sm font-semibold text-ink"><span>{item.name}</span><span>{pct(item.accuracy)}</span></div>
// // //                   <div className="mt-1 text-xs text-steel">{item.classification} | Avg time {score(item.average_time)}s</div>
// // //                   <div className="mt-2 h-2 rounded bg-slate-100"><div className="h-2 rounded bg-accent" style={{ width: `${Math.min(100, item.accuracy)}%` }} /></div>
// // //                 </button>
// // //               ))}
// // //             </div>
// // //           </div>
// // //           <div className="space-y-5">
// // //             <AreaList title="Strong Areas" empty="No strong areas yet." items={result.analytics.strengths} onPick={setTopic} />
// // //             <AreaList title="Weak Areas" empty="No weak areas yet." items={result.analytics.weaknesses} onPick={setTopic} />
// // //           </div>
// // //         </section>

// // //         <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
// // //           <div className="flex flex-wrap items-center justify-between gap-3">
// // //             <h2 className="text-lg font-semibold text-ink">AI Assistance</h2>
// // //             <button className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-steel" disabled>AI Assistance - Coming Soon</button>
// // //           </div>
// // //           {aiAnalysis ? <pre className="mt-4 whitespace-pre-wrap rounded-md bg-[#fafbfc] p-4 text-sm text-steel">{JSON.stringify(aiAnalysis, null, 2)}</pre> : <p className="mt-3 text-sm text-steel">AI assistance is currently disabled. Local scoring and analytics are complete.</p>}
// // //         </section>

// // //         <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
// // //           <div className="flex flex-wrap items-center justify-between gap-3">
// // //             <h2 className="text-lg font-semibold text-ink">Detailed Analysis</h2>
// // //             <div className="flex flex-wrap gap-2">
// // //               <input className="focus-ring rounded-md border border-line px-3 py-2 text-sm" placeholder="Search questions" value={search} onChange={(event) => setSearch(event.target.value)} />
// // //               <select className="focus-ring rounded-md border border-line px-3 py-2 text-sm" value={filter} onChange={(event) => setFilter(event.target.value as ReviewFilter)}>
// // //                 {["all", "correct", "wrong", "unattempted", "marked", "weak"].map((item) => <option key={item} value={item}>{item}</option>)}
// // //               </select>
// // //               <select className="focus-ring rounded-md border border-line px-3 py-2 text-sm" value={section} onChange={(event) => setSection(event.target.value)}><option value="">All sections</option>{sections.map((item) => <option key={item.id}>{item.name}</option>)}</select>
// // //               <select className="focus-ring rounded-md border border-line px-3 py-2 text-sm" value={topic} onChange={(event) => setTopic(event.target.value)}><option value="">All topics</option>{topics.map((item) => <option key={item}>{item}</option>)}</select>
// // //             </div>
// // //           </div>
// // //           <div className="mt-5 space-y-4">
// // //             {visibleQuestions.map((row) => <QuestionReview key={row.question_id} row={row} question={questionById.get(row.question_id)} message={explanationMessages[row.question_id]} onExplain={() => explain(row.question_id)} />)}
// // //             {!visibleQuestions.length ? <div className="rounded-md border border-line p-4 text-sm text-steel">No questions match this filter.</div> : null}
// // //           </div>
// // //         </section>
// // //       </div>
// // //     </main>
// // //   );
// // // }

// // // function AreaList({ title, empty, items, onPick }: { title: string; empty: string; items: ResultPayload["analytics"]["strengths"]; onPick: (topic: string) => void }) {
// // //   return (
// // //     <div className="rounded-lg border border-line bg-white p-5 shadow-panel">
// // //       <h2 className="text-lg font-semibold text-ink">{title}</h2>
// // //       <div className="mt-3 space-y-2">
// // //         {items.map((item) => <button key={item.name} className="flex w-full justify-between rounded-md border border-line px-3 py-2 text-sm" onClick={() => onPick(item.name)}><span>{item.name}</span><span>{pct(item.accuracy)}</span></button>)}
// // //         {!items.length ? <div className="text-sm text-steel">{empty}</div> : null}
// // //       </div>
// // //     </div>
// // //   );
// // // }

// // // function QuestionReview({ row, question, message, onExplain }: { row: QuestionResult; question?: ResultPayload["questions"][number]; message?: string; onExplain: () => void }) {
// // //   const status = row.status === "correct" ? "Correct" : row.status === "wrong" ? "Wrong" : "Unattempted";
// // //   return (
// // //     <article className="rounded-md border border-line p-4">
// // //       <div className="flex flex-wrap justify-between gap-3">
// // //         <h3 className="font-semibold text-ink">Question {row.question_number ?? row.question_id}</h3>
// // //         <div className="text-sm font-semibold text-ink">{status} | Marks {row.marks >= 0 ? "+" : ""}{score(row.marks)}</div>
// // //       </div>
// // //       <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink">{question?.question_text}</p>
// // //       {question?.question_images.length ? <div className="mt-3 grid gap-3 md:grid-cols-2">{question.question_images.map((image) => <img key={image.path} loading="lazy" className="max-h-72 rounded-md border border-line object-contain" src={imageUrl(image.path)} alt="Question visual" />)}</div> : null}
// // //       <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
// // //         <div>Your Answer: <span className="font-semibold">{row.selected_answers.join(", ") || "Not Attempted"}</span></div>
// // //         <div>Correct Answer: <span className="font-semibold">{row.correct_answer.join(", ") || "-"}</span></div>
// // //         <div>Time: <span className="font-semibold">{row.time_spent_seconds}s</span></div>
// // //       </div>
// // //       <div className="mt-3 text-sm text-steel">Topic: {row.topic ?? "Uncategorized"} | Difficulty: {row.difficulty}</div>
// // //       <div className="mt-3 rounded-md border border-line bg-[#fafbfc] p-3 text-sm text-steel">
// // //         {question?.explanation?.text || message || "Explanation not provided."}
// // //       </div>
// // //       {question?.explanation?.images.length ? <div className="mt-3 grid gap-3 md:grid-cols-2">{question.explanation.images.map((image) => <img key={image.path} loading="lazy" className="max-h-72 rounded-md border border-line object-contain" src={imageUrl(image.path)} alt="Explanation visual" />)}</div> : null}
// // //       {!question?.explanation ? <div className="mt-3 text-sm text-steel">AI assistance - Coming Soon</div> : null}
// // //     </article>
// // //   );
// // // }



// // "use client";

// // import Link from "next/link";
// // import { useEffect, useMemo, useState } from "react";
// // import { useRouter } from "next/navigation";
// // import { ErrorMessage } from "@/components/common/ErrorMessage";
// // import { Loading } from "@/components/common/Loading";
// // import {
// //   exportUrl,
// //   generateAiAnalysis,
// //   generateExplanation,
// //   getResult,
// //   imageUrl,
// //   retakeAttempt,
// // } from "@/lib/api";
// // import type { QuestionResult, ResultPayload } from "@/lib/types";

// // type ReviewFilter =
// //   | "all"
// //   | "correct"
// //   | "wrong"
// //   | "unattempted"
// //   | "marked"
// //   | "weak";

// // function pct(value: number) {
// //   return `${Number(value || 0).toFixed(2)}%`;
// // }

// // function score(value: number) {
// //   return Number(value || 0).toFixed(2);
// // }

// // export function ResultClient({ attemptId }: { attemptId: string }) {
// //   const router = useRouter();

// //   const [result, setResult] =
// //     useState<ResultPayload | null>(null);
// //   const [error, setError] = useState("");
// //   const [loading, setLoading] = useState(true);
// //   const [aiLoading, setAiLoading] = useState(false);
// //   const [aiAnalysis, setAiAnalysis] =
// //     useState<Record<string, unknown> | null>(null);

// //   const [filter, setFilter] =
// //     useState<ReviewFilter>("all");
// //   const [section, setSection] = useState("");
// //   const [topic, setTopic] = useState("");
// //   const [search, setSearch] = useState("");

// //   const [explanationMessages, setExplanationMessages] =
// //     useState<Record<string, string>>({});

// //   useEffect(() => {
// //     async function load() {
// //       try {
// //         const payload = await getResult(attemptId);

// //         setResult(payload);
// //         setAiAnalysis(payload.ai_analysis);
// //       } catch (err) {
// //         setError(
// //           err instanceof Error
// //             ? err.message
// //             : "Unable to load result."
// //         );
// //       } finally {
// //         setLoading(false);
// //       }
// //     }

// //     void load();
// //   }, [attemptId]);

// //   const questionById = useMemo(
// //     () =>
// //       new Map(
// //         (result?.questions ?? []).map((question) => [
// //           question.id,
// //           question,
// //         ])
// //       ),
// //     [result]
// //   );

// //   const weakTopics = new Set(
// //     result?.analytics.weaknesses.map(
// //       (item) => item.name
// //     ) ?? []
// //   );

// //   const sections =
// //     result?.configuration.sections ?? [];

// //   const topics = Array.from(
// //     new Set(
// //       result?.questions
// //         .map((question) => question.topic)
// //         .filter(Boolean) as string[]
// //     )
// //   ).sort();

// //   const visibleQuestions = useMemo(() => {
// //     if (!result) return [];

// //     const q = search.trim().toLowerCase();

// //     return result.scoring.question_results.filter(
// //       (row) => {
// //         const question = questionById.get(
// //           row.question_id
// //         );

// //         const sectionName =
// //           sections.find(
// //             (item) => item.id === row.section_id
// //           )?.name ?? "";

// //         const haystack = [
// //           row.question_number,
// //           question?.question_text,
// //           question?.topic,
// //           question?.section,
// //         ]
// //           .join(" ")
// //           .toLowerCase();

// //         if (q && !haystack.includes(q)) {
// //           return false;
// //         }

// //         if (filter !== "all") {
// //           if (
// //             filter === "marked" &&
// //             !row.marked_for_review
// //           ) {
// //             return false;
// //           }

// //           if (
// //             filter === "weak" &&
// //             !weakTopics.has(row.topic ?? "")
// //           ) {
// //             return false;
// //           }

// //           if (
// //             ["correct", "wrong", "unattempted"].includes(
// //               filter
// //             ) &&
// //             row.status !== filter
// //           ) {
// //             return false;
// //           }
// //         }

// //         if (
// //           section &&
// //           sectionName !== section
// //         ) {
// //           return false;
// //         }

// //         if (
// //           topic &&
// //           row.topic !== topic
// //         ) {
// //           return false;
// //         }

// //         return true;
// //       }
// //     );
// //   }, [
// //     result,
// //     search,
// //     filter,
// //     section,
// //     topic,
// //     questionById,
// //     sections,
// //     weakTopics,
// //   ]);

// //   async function generateReview() {
// //     setAiLoading(true);
// //     setError("");

// //     try {
// //       const analysis =
// //         await generateAiAnalysis(attemptId);

// //       setAiAnalysis(analysis);
// //     } catch (err) {
// //       setError(
// //         err instanceof Error
// //           ? err.message
// //           : "AI analysis is temporarily unavailable."
// //       );
// //     } finally {
// //       setAiLoading(false);
// //     }
// //   }

// //   async function explain(questionId: string) {
// //     setExplanationMessages((current) => ({
// //       ...current,
// //       [questionId]: "Generating explanation...",
// //     }));

// //     try {
// //       const generated =
// //         await generateExplanation(questionId);

// //       setExplanationMessages((current) => ({
// //         ...current,
// //         [questionId]:
// //           `AI-generated explanation: ${String(
// //             generated.concept || ""
// //           )} ${String(
// //             generated.steps || ""
// //           )} Final answer: ${String(
// //             generated.final_answer || ""
// //           )}`,
// //       }));
// //     } catch (err) {
// //       setExplanationMessages((current) => ({
// //         ...current,
// //         [questionId]:
// //           err instanceof Error
// //             ? err.message
// //             : "AI explanation is temporarily unavailable.",
// //       }));
// //     }
// //   }

// //   async function retake() {
// //     const attempt =
// //       await retakeAttempt(attemptId);

// //     router.push(`/test/${attempt.test_id}`);
// //   }

// //   if (loading) {
// //     return (
// //       <main className="min-h-screen bg-[#f7f8fb] p-5">
// //         <Loading label="Loading result" />
// //       </main>
// //     );
// //   }

// //   if (!result) {
// //     return (
// //       <main className="min-h-screen bg-[#f7f8fb] p-5">
// //         <ErrorMessage
// //           message={error || "Result not found."}
// //         />
// //       </main>
// //     );
// //   }

// //   const display =
// //     result.analytics.display;

// //   const summary = [
// //     [
// //       "Total Questions",
// //       result.scoring.total_questions,
// //     ],
// //     ["Attempted", result.scoring.attempted],
// //     ["Correct", result.scoring.correct],
// //     ["Wrong", result.scoring.wrong],
// //     ["Unattempted", result.scoring.unattempted],
// //     [
// //       "Score",
// //       `${score(result.scoring.score)} / ${score(
// //         result.scoring.maximum_score
// //       )}`,
// //     ],
// //     [
// //       "Accuracy",
// //       pct(result.scoring.accuracy),
// //     ],
// //     [
// //       "Time Used",
// //       `${Math.floor(
// //         result.time_used_seconds / 60
// //       )}m ${
// //         result.time_used_seconds % 60
// //       }s`,
// //     ],
// //   ];

// //   return (
// //     <main className="min-h-screen bg-[#f7f8fb] px-4 py-5">
// //       <div className="mx-auto max-w-7xl space-y-5">
// //         <header className="rounded-lg border border-line bg-white p-5 shadow-panel">
// //           <div className="flex flex-wrap items-start justify-between gap-4">
// //             <div>
// //               <div className="text-sm font-semibold uppercase text-green-700">
// //                 TEST COMPLETED
// //               </div>

// //               <h1 className="mt-1 text-3xl font-semibold text-ink">
// //                 {result.configuration.test.title}
// //               </h1>

// //               <p className="mt-2 text-lg text-steel">
// //                 Score:{" "}
// //                 <span className="font-semibold text-ink">
// //                   {display.score} /{" "}
// //                   {display.maximum_score}
// //                 </span>{" "}
// //                 | Percentage: {display.percentage}% |
// //                 Accuracy: {display.accuracy}%
// //               </p>
// //             </div>

// //             <div className="flex flex-wrap gap-2">
// //               <button
// //                 className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-ink"
// //                 onClick={retake}
// //               >
// //                 Retake Test
// //               </button>

// //               <a
// //                 className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-ink"
// //                 href={exportUrl(
// //                   attemptId,
// //                   "json"
// //                 )}
// //               >
// //                 Download JSON
// //               </a>

// //               <a
// //                 className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-ink"
// //                 href={exportUrl(
// //                   attemptId,
// //                   "html"
// //                 )}
// //               >
// //                 Download HTML
// //               </a>

// //               <a
// //                 className="rounded-md bg-forge px-4 py-2 text-sm font-semibold text-white"
// //                 href={exportUrl(
// //                   attemptId,
// //                   "pdf"
// //                 )}
// //               >
// //                 Download PDF
// //               </a>

// //               <Link
// //                 className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-ink"
// //                 href="/history"
// //               >
// //                 History
// //               </Link>
// //             </div>
// //           </div>
// //         </header>

// //         {error ? (
// //           <ErrorMessage message={error} />
// //         ) : null}

// //         <section className="grid gap-3 md:grid-cols-4">
// //           {summary.map(([label, value]) => (
// //             <div
// //               key={label}
// //               className="rounded-lg border border-line bg-white p-4 shadow-panel"
// //             >
// //               <div className="text-xs uppercase text-steel">
// //                 {label}
// //               </div>

// //               <div className="mt-1 text-xl font-semibold text-ink">
// //                 {value}
// //               </div>
// //             </div>
// //           ))}
// //         </section>

// //         <section className="grid gap-5 lg:grid-cols-2">
// //           <div className="rounded-lg border border-line bg-white p-5 shadow-panel">
// //             <h2 className="text-lg font-semibold text-ink">
// //               Section Analysis
// //             </h2>

// //             <div className="mt-4 overflow-auto">
// //               <table className="w-full text-left text-sm">
// //                 <thead className="text-xs uppercase text-steel">
// //                   <tr>
// //                     {[
// //                       "Section",
// //                       "Questions",
// //                       "Attempted",
// //                       "Correct",
// //                       "Wrong",
// //                       "Unattempted",
// //                       "Score",
// //                       "Accuracy",
// //                     ].map((h) => (
// //                       <th
// //                         key={h}
// //                         className="border-b border-line py-2"
// //                       >
// //                         {h}
// //                       </th>
// //                     ))}
// //                   </tr>
// //                 </thead>

// //                 <tbody>
// //                   {result.analytics.section_analysis.map(
// //                     (item) => (
// //                       <tr key={item.name}>
// //                         <td className="border-b border-line py-2">
// //                           {item.name}
// //                         </td>
// //                         <td>{item.questions}</td>
// //                         <td>{item.attempted}</td>
// //                         <td>{item.correct}</td>
// //                         <td>{item.wrong}</td>
// //                         <td>{item.unattempted}</td>
// //                         <td>{score(item.score)}</td>
// //                         <td>{pct(item.accuracy)}</td>
// //                       </tr>
// //                     )
// //                   )}
// //                 </tbody>
// //               </table>
// //             </div>
// //           </div>

// //           <div className="rounded-lg border border-line bg-white p-5 shadow-panel">
// //             <h2 className="text-lg font-semibold text-ink">
// //               Section Comparison
// //             </h2>

// //             <div className="mt-4 space-y-3">
// //               {result.analytics.section_analysis.map(
// //                 (item) => (
// //                   <button
// //                     key={item.name}
// //                     className="block w-full text-left"
// //                     onClick={() =>
// //                       setSection(item.name)
// //                     }
// //                   >
// //                     <div className="flex justify-between text-sm">
// //                       <span>{item.name}</span>
// //                       <span>
// //                         {pct(item.accuracy)}
// //                       </span>
// //                     </div>

// //                     <div className="mt-1 h-3 rounded bg-slate-100">
// //                       <div
// //                         className="h-3 rounded bg-forge"
// //                         style={{
// //                           width: `${Math.min(
// //                             100,
// //                             item.accuracy
// //                           )}%`,
// //                         }}
// //                       />
// //                     </div>
// //                   </button>
// //                 )
// //               )}
// //             </div>
// //           </div>
// //         </section>

// //         <section className="grid gap-5 lg:grid-cols-3">
// //           <div className="rounded-lg border border-line bg-white p-5 shadow-panel lg:col-span-2">
// //             <h2 className="text-lg font-semibold text-ink">
// //               Topic Analysis
// //             </h2>

// //             <div className="mt-4 grid gap-3 md:grid-cols-2">
// //               {result.analytics.topic_analysis.map(
// //                 (item) => (
// //                   <button
// //                     key={item.name}
// //                     className="rounded-md border border-line p-3 text-left"
// //                     onClick={() =>
// //                       setTopic(item.name)
// //                     }
// //                   >
// //                     <div className="flex justify-between text-sm font-semibold text-ink">
// //                       <span>{item.name}</span>
// //                       <span>
// //                         {pct(item.accuracy)}
// //                       </span>
// //                     </div>

// //                     <div className="mt-1 text-xs text-steel">
// //                       {item.classification} | Avg time{" "}
// //                       {score(item.average_time)}s
// //                     </div>

// //                     <div className="mt-2 h-2 rounded bg-slate-100">
// //                       <div
// //                         className="h-2 rounded bg-accent"
// //                         style={{
// //                           width: `${Math.min(
// //                             100,
// //                             item.accuracy
// //                           )}%`,
// //                         }}
// //                       />
// //                     </div>
// //                   </button>
// //                 )
// //               )}
// //             </div>
// //           </div>

// //           <div className="space-y-5">
// //             <AreaList
// //               title="Strong Areas"
// //               empty="No strong areas yet."
// //               items={result.analytics.strengths}
// //               onPick={setTopic}
// //             />

// //             <AreaList
// //               title="Weak Areas"
// //               empty="No weak areas yet."
// //               items={result.analytics.weaknesses}
// //               onPick={setTopic}
// //             />
// //           </div>
// //         </section>

// //         <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
// //           <div className="flex flex-wrap items-center justify-between gap-3">
// //             <h2 className="text-lg font-semibold text-ink">
// //               AI Assistance
// //             </h2>

// //             <button
// //               className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-steel"
// //               disabled
// //             >
// //               AI Assistance - Coming Soon
// //             </button>
// //           </div>

// //           {aiAnalysis ? (
// //             <pre className="mt-4 whitespace-pre-wrap rounded-md bg-[#fafbfc] p-4 text-sm text-steel">
// //               {JSON.stringify(
// //                 aiAnalysis,
// //                 null,
// //                 2
// //               )}
// //             </pre>
// //           ) : (
// //             <p className="mt-3 text-sm text-steel">
// //               AI assistance is currently disabled.
// //               Local scoring and analytics are complete.
// //             </p>
// //           )}
// //         </section>

// //         <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
// //           <div className="flex flex-wrap items-center justify-between gap-3">
// //             <h2 className="text-lg font-semibold text-ink">
// //               Detailed Analysis
// //             </h2>

// //             <div className="flex flex-wrap gap-2">
// //               <input
// //                 className="focus-ring rounded-md border border-line px-3 py-2 text-sm"
// //                 placeholder="Search questions"
// //                 value={search}
// //                 onChange={(event) =>
// //                   setSearch(event.target.value)
// //                 }
// //               />

// //               <select
// //                 className="focus-ring rounded-md border border-line px-3 py-2 text-sm"
// //                 value={filter}
// //                 onChange={(event) =>
// //                   setFilter(
// //                     event.target.value as ReviewFilter
// //                   )
// //                 }
// //               >
// //                 {[
// //                   "all",
// //                   "correct",
// //                   "wrong",
// //                   "unattempted",
// //                   "marked",
// //                   "weak",
// //                 ].map((item) => (
// //                   <option
// //                     key={item}
// //                     value={item}
// //                   >
// //                     {item}
// //                   </option>
// //                 ))}
// //               </select>

// //               <select
// //                 className="focus-ring rounded-md border border-line px-3 py-2 text-sm"
// //                 value={section}
// //                 onChange={(event) =>
// //                   setSection(event.target.value)
// //                 }
// //               >
// //                 <option value="">
// //                   All sections
// //                 </option>

// //                 {sections.map((item) => (
// //                   <option
// //                     key={item.id}
// //                     value={item.name}
// //                   >
// //                     {item.name}
// //                   </option>
// //                 ))}
// //               </select>

// //               <select
// //                 className="focus-ring rounded-md border border-line px-3 py-2 text-sm"
// //                 value={topic}
// //                 onChange={(event) =>
// //                   setTopic(event.target.value)
// //                 }
// //               >
// //                 <option value="">
// //                   All topics
// //                 </option>

// //                 {topics.map((item) => (
// //                   <option
// //                     key={item}
// //                     value={item}
// //                   >
// //                     {item}
// //                   </option>
// //                 ))}
// //               </select>
// //             </div>
// //           </div>

// //           <div className="mt-5 space-y-4">
// //             {visibleQuestions.map((row) => (
// //               <QuestionReview
// //                 key={row.question_id}
// //                 row={row}
// //                 question={questionById.get(
// //                   row.question_id
// //                 )}
// //                 message={
// //                   explanationMessages[
// //                     row.question_id
// //                   ]
// //                 }
// //                 onExplain={() =>
// //                   explain(row.question_id)
// //                 }
// //               />
// //             ))}

// //             {!visibleQuestions.length ? (
// //               <div className="rounded-md border border-line p-4 text-sm text-steel">
// //                 No questions match this filter.
// //               </div>
// //             ) : null}
// //           </div>
// //         </section>
// //       </div>
// //     </main>
// //   );
// // }

// // function AreaList({
// //   title,
// //   empty,
// //   items,
// //   onPick,
// // }: {
// //   title: string;
// //   empty: string;
// //   items: ResultPayload["analytics"]["strengths"];
// //   onPick: (topic: string) => void;
// // }) {
// //   return (
// //     <div className="rounded-lg border border-line bg-white p-5 shadow-panel">
// //       <h2 className="text-lg font-semibold text-ink">
// //         {title}
// //       </h2>

// //       <div className="mt-3 space-y-2">
// //         {items.map((item) => (
// //           <button
// //             key={item.name}
// //             className="flex w-full justify-between rounded-md border border-line px-3 py-2 text-sm"
// //             onClick={() => onPick(item.name)}
// //           >
// //             <span>{item.name}</span>
// //             <span>{pct(item.accuracy)}</span>
// //           </button>
// //         ))}

// //         {!items.length ? (
// //           <div className="text-sm text-steel">
// //             {empty}
// //           </div>
// //         ) : null}
// //       </div>
// //     </div>
// //   );
// // }

// // function QuestionReview({
// //   row,
// //   question,
// //   message,
// //   onExplain,
// // }: {
// //   row: QuestionResult;
// //   question?: ResultPayload["questions"][number];
// //   message?: string;
// //   onExplain: () => void;
// // }) {
// //   const status =
// //     row.status === "correct"
// //       ? "Correct"
// //       : row.status === "wrong"
// //         ? "Wrong"
// //         : "Unattempted";

// //   const marksDisplay =
// //     row.marks === null
// //       ? "Pending Evaluation"
// //       : `${row.marks >= 0 ? "+" : ""}${score(
// //           row.marks
// //         )}`;

// //   return (
// //     <article className="rounded-md border border-line p-4">
// //       <div className="flex flex-wrap justify-between gap-3">
// //         <h3 className="font-semibold text-ink">
// //           Question{" "}
// //           {row.question_number ?? row.question_id}
// //         </h3>

// //         <div className="text-sm font-semibold text-ink">
// //           {status} | Marks {marksDisplay}
// //         </div>
// //       </div>

// //       <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink">
// //         {question?.question_text}
// //       </p>

// //       {question?.question_images.length ? (
// //         <div className="mt-3 grid gap-3 md:grid-cols-2">
// //           {question.question_images.map(
// //             (image) => (
// //               <img
// //                 key={image.path}
// //                 loading="lazy"
// //                 className="max-h-72 rounded-md border border-line object-contain"
// //                 src={imageUrl(image.path)}
// //                 alt="Question visual"
// //               />
// //             )
// //           )}
// //         </div>
// //       ) : null}

// //       <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
// //         <div>
// //           Your Answer:{" "}
// //           <span className="font-semibold">
// //             {row.selected_answers.join(", ") ||
// //               "Not Attempted"}
// //           </span>
// //         </div>

// //         <div>
// //           Correct Answer:{" "}
// //           <span className="font-semibold">
// //             {row.correct_answer.join(", ") || "-"}
// //           </span>
// //         </div>

// //         <div>
// //           Time:{" "}
// //           <span className="font-semibold">
// //             {row.time_spent_seconds}s
// //           </span>
// //         </div>
// //       </div>

// //       <div className="mt-3 text-sm text-steel">
// //         Topic: {row.topic ?? "Uncategorized"} |
// //         Difficulty: {row.difficulty}
// //       </div>

// //       <div className="mt-3 rounded-md border border-line bg-[#fafbfc] p-3 text-sm text-steel">
// //         {question?.explanation?.text ||
// //           message ||
// //           "Explanation not provided."}
// //       </div>

// //       {question?.explanation?.images.length ? (
// //         <div className="mt-3 grid gap-3 md:grid-cols-2">
// //           {question.explanation.images.map(
// //             (image) => (
// //               <img
// //                 key={image.path}
// //                 loading="lazy"
// //                 className="max-h-72 rounded-md border border-line object-contain"
// //                 src={imageUrl(image.path)}
// //                 alt="Explanation visual"
// //               />
// //             )
// //           )}
// //         </div>
// //       ) : null}

// //       {!question?.explanation ? (
// //         <div className="mt-3 text-sm text-steel">
// //           AI assistance - Coming Soon
// //         </div>
// //       ) : null}
// //     </article>
// //   );
// // }



// "use client";

// import Link from "next/link";
// import { useEffect,useMemo,useState } from "react";
// import { useRouter } from "next/navigation";
// import { exportUrl,generateAiAnalysis,generateExplanation,getResult,imageUrl,retakeAttempt } from "@/lib/api";
// import { ErrorMessage } from "@/components/common/ErrorMessage";
// import { Loading } from "@/components/common/Loading";
// import type { QuestionResult,ResultPayload } from "@/lib/types";

// type Filter="all"|"correct"|"wrong"|"unattempted"|"marked"|"weak";
// const score=(x:number)=>Number(x||0).toFixed(2);
// const pct=(x:number)=>`${Number(x||0).toFixed(2)}%`;

// export function ResultClient({attemptId}:{attemptId:string}){
//  const router=useRouter();const[result,setResult]=useState<ResultPayload|null>(null);const[loading,setLoading]=useState(true);const[error,setError]=useState("");const[filter,setFilter]=useState<Filter>("all");const[section,setSection]=useState("");const[topic,setTopic]=useState("");const[search,setSearch]=useState("");const[ai,setAi]=useState<Record<string,unknown>|null>(null);const[aiLoading,setAiLoading]=useState(false);const[explain,setExplain]=useState<Record<string,string>>({});
//  useEffect(()=>{void (async()=>{try{const r=await getResult(attemptId);setResult(r);setAi(r.ai_analysis);}catch(e){setError(e instanceof Error?e.message:"Unable to load result.");}finally{setLoading(false);}})();},[attemptId]);
//  const byId=useMemo(()=>new Map((result?.questions??[]).map(q=>[q.id,q])),[result]);
//  const sections=result?.configuration.sections??[];const topics=Array.from(new Set(result?.questions.map(q=>q.topic).filter(Boolean) as string[])).sort();const weak=new Set(result?.analytics.weaknesses.map(x=>x.name)??[]);
//  const rows=useMemo(()=>!result?[]:result.scoring.question_results.filter(r=>{const q=byId.get(r.question_id);const sn=sections.find(s=>s.id===r.section_id)?.name??"";const hay=[r.question_number,q?.question_text,q?.topic,q?.section].join(" ").toLowerCase();if(search&&!hay.includes(search.toLowerCase()))return false;if(filter==="marked"&&!r.marked_for_review)return false;if(filter==="weak"&&!weak.has(r.topic??""))return false;if(["correct","wrong","unattempted"].includes(filter)&&r.status!==filter)return false;if(section&&sn!==section)return false;if(topic&&r.topic!==topic)return false;return true;}),[result,byId,sections,search,filter,section,topic,weak]);
//  async function aiReview(){setAiLoading(true);try{setAi(await generateAiAnalysis(attemptId));}catch(e){setError(e instanceof Error?e.message:"AI analysis unavailable.");}finally{setAiLoading(false);}}
//  async function explainOne(id:string){setExplain(x=>({...x,[id]:"Generating explanation..."}));try{const x=await generateExplanation(id);setExplain(v=>({...v,[id]:`AI: ${String(x.concept??"")} ${String(x.steps??"")} Final answer: ${String(x.final_answer??"")}`}));}catch(e){setExplain(v=>({...v,[id]:e instanceof Error?e.message:"Explanation unavailable."}));}}
//  if(loading)return <main className="p-5"><Loading label="Loading result"/></main>;if(!result)return <main className="p-5"><ErrorMessage message={error||"Result not found."}/></main>;
//  const d=result.analytics.display;
//  return <main className="min-h-screen bg-[#f7f8fb] px-4 py-5"><div className="mx-auto max-w-7xl space-y-5">
//   <header className="rounded-lg border border-line bg-white p-5 shadow-panel"><div className="flex flex-wrap justify-between gap-3"><div><div className="text-sm font-semibold uppercase text-green-700">TEST COMPLETED</div><h1 className="text-3xl font-semibold">{result.configuration.test.title}</h1><p className="mt-2 text-lg text-steel">Score <b>{d.score} / {d.maximum_score}</b> | Percentage {d.percentage}% | Accuracy {d.accuracy}%</p></div><div className="flex flex-wrap gap-2"><button className="rounded border border-line px-3 py-2 text-sm" onClick={async()=>{const a=await retakeAttempt(attemptId);router.push(`/test/${a.test_id}`)}}>Retake</button><a className="rounded border border-line px-3 py-2 text-sm" href={exportUrl(attemptId,"json")}>JSON</a><a className="rounded border border-line px-3 py-2 text-sm" href={exportUrl(attemptId,"html")}>HTML</a><a className="rounded bg-forge px-3 py-2 text-sm text-white" href={exportUrl(attemptId,"pdf")}>PDF</a><Link className="rounded border border-line px-3 py-2 text-sm" href="/history">History</Link></div></div></header>
//   {error&&<ErrorMessage message={error}/>}
//   <section className="grid gap-3 md:grid-cols-4">{[["Questions",result.scoring.total_questions],["Attempted",result.scoring.attempted],["Correct",result.scoring.correct],["Wrong",result.scoring.wrong],["Unattempted",result.scoring.unattempted],["Score",`${score(result.scoring.score)} / ${score(result.scoring.maximum_score)}`],["Accuracy",pct(result.scoring.accuracy)],["Time",`${Math.floor(result.time_used_seconds/60)}m ${result.time_used_seconds%60}s`]].map(([l,v])=><div key={String(l)} className="rounded border border-line bg-white p-4"><div className="text-xs uppercase text-steel">{l}</div><div className="mt-1 text-xl font-semibold">{v}</div></div>)}</section>
//   <section className="grid gap-5 lg:grid-cols-2"><Analysis title="Section Analysis" items={result.analytics.section_analysis} onPick={setSection}/><Analysis title="Topic Analysis" items={result.analytics.topic_analysis} onPick={setTopic}/></section>
//   <section className="rounded-lg border border-line bg-white p-5 shadow-panel"><div className="flex flex-wrap justify-between gap-3"><h2 className="text-lg font-semibold">AI Assistance</h2><button className="rounded border border-line px-3 py-2 text-sm" disabled={aiLoading} onClick={()=>void aiReview()}>{aiLoading?"Generating...":"Generate Review"}</button></div>{ai?<pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded bg-[#fafbfc] p-4 text-sm">{JSON.stringify(ai,null,2)}</pre>:<p className="mt-3 text-sm text-steel">Generate an optional AI review.</p>}</section>
//   <section className="rounded-lg border border-line bg-white p-5 shadow-panel"><div className="flex flex-wrap gap-2"><input className="rounded border border-line px-3 py-2 text-sm" placeholder="Search questions" value={search} onChange={e=>setSearch(e.target.value)}/><select className="rounded border border-line px-3 py-2 text-sm" value={filter} onChange={e=>setFilter(e.target.value as Filter)}>{["all","correct","wrong","unattempted","marked","weak"].map(x=><option key={x}>{x}</option>)}</select><select className="rounded border border-line px-3 py-2 text-sm" value={section} onChange={e=>setSection(e.target.value)}><option value="">All sections</option>{sections.map(s=><option key={s.id}>{s.name}</option>)}</select><select className="rounded border border-line px-3 py-2 text-sm" value={topic} onChange={e=>setTopic(e.target.value)}><option value="">All topics</option>{topics.map(x=><option key={x}>{x}</option>)}</select></div><div className="mt-5 space-y-4">{rows.map(r=><QuestionReview key={r.question_id} row={r} question={byId.get(r.question_id)} aiMessage={explain[r.question_id]} onExplain={()=>void explainOne(r.question_id)}/>)}</div></section>
//  </div></main>
// }

// function Analysis({title,items,onPick}:{title:string;items:ResultPayload["analytics"]["section_analysis"];onPick:(x:string)=>void}){return <div className="rounded-lg border border-line bg-white p-5 shadow-panel"><h2 className="text-lg font-semibold">{title}</h2><div className="mt-4 space-y-3">{items.map(x=><button key={x.name} className="block w-full text-left" onClick={()=>onPick(x.name)}><div className="flex justify-between text-sm"><span>{x.name}</span><span>{pct(x.accuracy)}</span></div><div className="mt-1 h-2 rounded bg-slate-100"><div className="h-2 rounded bg-forge" style={{width:`${Math.min(100,x.accuracy)}%`}}/></div><div className="mt-1 text-xs text-steel">{x.questions} questions | {x.correct} correct | {x.wrong} wrong | Score {score(x.score)}</div></button>)}</div></div>}

// function QuestionReview({row,question,aiMessage,onExplain}:{row:QuestionResult;question?:ResultPayload["questions"][number];aiMessage?:string;onExplain:()=>void}){
//  const r=row as QuestionResult & {evaluation?:string;maximum_marks?:number;numeric_value?:string|null;text_answer?:string|null};
//  const status=row.status==="correct"?"Correct":row.status==="wrong"?"Wrong":"Unattempted";
//  const userValue=r.text_answer??r.numeric_value??row.selected_answers.join(", ");
//  return <article className="rounded border border-line p-4"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">Question {row.question_number??row.question_id}</h3><div className="text-sm font-semibold">{status} | Marks {row.marks>=0?"+":""}{score(row.marks)}{r.maximum_marks!==undefined?` / ${score(r.maximum_marks)}`:""}</div></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{question?.question_text}</p>{question?.question_images.length?<div className="mt-3 grid gap-3 md:grid-cols-2">{question.question_images.map(i=><img key={i.path} className="max-h-72 w-full object-contain" src={imageUrl(i.path)} alt={i.alt_text??"Question visual"}/>)}</div>:null}<div className="mt-3 grid gap-3 md:grid-cols-3 text-sm"><div>Your Answer: <b>{userValue||"Not Attempted"}</b></div><div>Correct: <b>{row.correct_answer.join(", ")||"-"}</b></div><div>Time: <b>{row.time_spent_seconds}s</b></div></div><div className="mt-2 text-xs text-steel">Type: {question?.question_type} | Evaluation: {r.evaluation??question?.answer_config.evaluation??"automatic"} | Marked: {row.marked_for_review?"Yes":"No"}</div>{question?.answer_config.accepted_answers.length?<div className="mt-2 text-xs text-steel">Accepted aliases: {question.answer_config.accepted_answers.join(", ")}</div>:null}<div className="mt-3 rounded bg-[#fafbfc] p-3 text-sm">{question?.explanation?.text||aiMessage||"Explanation not provided."}</div>{question?.explanation?.images.length?<div className="mt-3 grid gap-2 md:grid-cols-2">{question.explanation.images.map(i=><img key={i.path} className="max-h-64 w-full object-contain" src={imageUrl(i.path)} alt="Explanation visual"/>)}</div>:null}<button className="mt-3 rounded border border-line px-3 py-2 text-xs" onClick={onExplain}>Generate AI Explanation</button></article>
// }


"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { ErrorMessage } from "@/components/common/ErrorMessage";
import { Loading } from "@/components/common/Loading";
import {
  exportUrl,
  generateAiAnalysis,
  generateExplanation,
  getResult,
  imageUrl,
  retakeAttempt,
} from "@/lib/api";
import type { QuestionResult, ResultPayload } from "@/lib/types";

type ReviewFilter =
  | "all"
  | "correct"
  | "wrong"
  | "unattempted"
  | "marked"
  | "weak";

function pct(value: number) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function score(value: number) {
  return Number(value || 0).toFixed(2);
}

export function ResultClient({
  attemptId,
}: {
  attemptId: string;
}) {
  const router = useRouter();

  const [result, setResult] =
    useState<ResultPayload | null>(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] =
    useState<Record<string, unknown> | null>(null);

  const [filter, setFilter] =
    useState<ReviewFilter>("all");

  const [section, setSection] = useState("");
  const [topic, setTopic] = useState("");
  const [search, setSearch] = useState("");

  const [explanationMessages, setExplanationMessages] =
    useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      try {
        const payload = await getResult(attemptId);

        setResult(payload);
        setAiAnalysis(payload.ai_analysis);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load result."
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [attemptId]);

  const questionById = useMemo(
    () =>
      new Map(
        (result?.questions ?? []).map((question) => [
          question.id,
          question,
        ])
      ),
    [result]
  );

  const weakTopics = new Set(
    result?.analytics.weaknesses.map(
      (item) => item.name
    ) ?? []
  );

  const sections =
    result?.configuration.sections ?? [];

  const topics = Array.from(
    new Set(
      result?.questions
        .map((question) => question.topic)
        .filter(Boolean) as string[]
    )
  ).sort();

  const visibleQuestions = useMemo(() => {
    if (!result) {
      return [];
    }

    const q = search.trim().toLowerCase();

    return result.scoring.question_results.filter(
      (row) => {
        const question = questionById.get(
          row.question_id
        );

        const sectionName =
          sections.find(
            (item) => item.id === row.section_id
          )?.name ?? "";

        const haystack = [
          row.question_number,
          question?.question_text,
          question?.topic,
          question?.section,
        ]
          .join(" ")
          .toLowerCase();

        if (q && !haystack.includes(q)) {
          return false;
        }

        if (filter !== "all") {
          if (
            filter === "marked" &&
            !row.marked_for_review
          ) {
            return false;
          }

          if (
            filter === "weak" &&
            !weakTopics.has(row.topic ?? "")
          ) {
            return false;
          }

          if (
            ["correct", "wrong", "unattempted"].includes(
              filter
            ) &&
            row.status !== filter
          ) {
            return false;
          }
        }

        if (
          section &&
          sectionName !== section
        ) {
          return false;
        }

        if (
          topic &&
          row.topic !== topic
        ) {
          return false;
        }

        return true;
      }
    );
  }, [
    result,
    search,
    filter,
    section,
    topic,
    questionById,
    sections,
    weakTopics,
  ]);

  async function generateReview() {
    setAiLoading(true);
    setError("");

    try {
      const analysis =
        await generateAiAnalysis(attemptId);

      setAiAnalysis(analysis);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "AI analysis is temporarily unavailable."
      );
    } finally {
      setAiLoading(false);
    }
  }

  async function explain(questionId: string) {
    setExplanationMessages((current) => ({
      ...current,
      [questionId]: "Generating explanation...",
    }));

    try {
      const generated =
        await generateExplanation(questionId);

      setExplanationMessages((current) => ({
        ...current,
        [questionId]:
          `AI-generated explanation: ${String(
            generated.concept || ""
          )} ${String(
            generated.steps || ""
          )} Final answer: ${String(
            generated.final_answer || ""
          )}`,
      }));
    } catch (err) {
      setExplanationMessages((current) => ({
        ...current,
        [questionId]:
          err instanceof Error
            ? err.message
            : "AI explanation is temporarily unavailable.",
      }));
    }
  }

  async function retake() {
    try {
      const attempt =
        await retakeAttempt(attemptId);

      router.push(`/test/${attempt.test_id}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to start retake."
      );
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f8fb] p-5">
        <Loading label="Loading result" />
      </main>
    );
  }

  if (!result) {
    return (
      <main className="min-h-screen bg-[#f7f8fb] p-5">
        <ErrorMessage
          message={error || "Result not found."}
        />
      </main>
    );
  }

  const display =
    result.analytics.display;

  const summary = [
    [
      "Total Questions",
      result.scoring.total_questions,
    ],
    [
      "Attempted",
      result.scoring.attempted,
    ],
    [
      "Correct",
      result.scoring.correct,
    ],
    [
      "Wrong",
      result.scoring.wrong,
    ],
    [
      "Unattempted",
      result.scoring.unattempted,
    ],
    [
      "Score",
      `${score(result.scoring.score)} / ${score(
        result.scoring.maximum_score
      )}`,
    ],
    [
      "Accuracy",
      pct(result.scoring.accuracy),
    ],
    [
      "Time Used",
      `${Math.floor(
        result.time_used_seconds / 60
      )}m ${
        result.time_used_seconds % 60
      }s`,
    ],
  ] as Array<[string, string | number]>;

  return (
    <main className="min-h-screen bg-[#f7f8fb] px-4 py-5">
      <div className="mx-auto max-w-7xl space-y-5">

        {/* =====================================================
            RESULT HEADER
        ====================================================== */}

        <header className="rounded-lg border border-line bg-white p-5 shadow-panel">
          <div className="flex flex-wrap items-start justify-between gap-4">

            <div>
              <div className="text-sm font-semibold uppercase text-green-700">
                TEST COMPLETED
              </div>

              <h1 className="mt-1 text-3xl font-semibold text-ink">
                {result.configuration.test.title}
              </h1>

              <p className="mt-2 text-lg text-steel">
                Score:{" "}
                <span className="font-semibold text-ink">
                  {display.score} /{" "}
                  {display.maximum_score}
                </span>{" "}
                | Percentage:{" "}
                {display.percentage}% | Accuracy:{" "}
                {display.accuracy}%
              </p>
            </div>

            <div className="flex flex-wrap gap-2">

              <button
                className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-ink"
                onClick={() => void retake()}
              >
                Retake Test
              </button>

              <a
                className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-ink"
                href={exportUrl(
                  attemptId,
                  "json"
                )}
              >
                Download JSON
              </a>

              <a
                className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-ink"
                href={exportUrl(
                  attemptId,
                  "html"
                )}
              >
                Download HTML
              </a>

              <a
                className="rounded-md bg-forge px-4 py-2 text-sm font-semibold text-white"
                href={exportUrl(
                  attemptId,
                  "pdf"
                )}
              >
                Download PDF
              </a>

              <Link
                className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-ink"
                href="/history"
              >
                History
              </Link>

            </div>
          </div>
        </header>

        {error ? (
          <ErrorMessage message={error} />
        ) : null}

        {/* =====================================================
            SUMMARY
        ====================================================== */}

        <section className="grid gap-3 md:grid-cols-4">
          {summary.map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-line bg-white p-4 shadow-panel"
            >
              <div className="text-xs uppercase text-steel">
                {label}
              </div>

              <div className="mt-1 text-xl font-semibold text-ink">
                {value}
              </div>
            </div>
          ))}
        </section>

        {/* =====================================================
            SECTION ANALYSIS
        ====================================================== */}

        <section className="grid gap-5 lg:grid-cols-2">

          <div className="rounded-lg border border-line bg-white p-5 shadow-panel">
            <h2 className="text-lg font-semibold text-ink">
              Section Analysis
            </h2>

            <div className="mt-4 overflow-auto">
              <table className="w-full text-left text-sm">

                <thead className="text-xs uppercase text-steel">
                  <tr>
                    {[
                      "Section",
                      "Questions",
                      "Attempted",
                      "Correct",
                      "Wrong",
                      "Unattempted",
                      "Score",
                      "Accuracy",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="border-b border-line py-2"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {result.analytics.section_analysis.map(
                    (item) => (
                      <tr key={item.name}>

                        <td className="border-b border-line py-2">
                          {item.name}
                        </td>

                        <td>{item.questions}</td>

                        <td>{item.attempted}</td>

                        <td>{item.correct}</td>

                        <td>{item.wrong}</td>

                        <td>{item.unattempted}</td>

                        <td>{score(item.score)}</td>

                        <td>{pct(item.accuracy)}</td>

                      </tr>
                    )
                  )}
                </tbody>

              </table>
            </div>
          </div>

          <div className="rounded-lg border border-line bg-white p-5 shadow-panel">

            <h2 className="text-lg font-semibold text-ink">
              Section Comparison
            </h2>

            <div className="mt-4 space-y-3">

              {result.analytics.section_analysis.map(
                (item) => (
                  <button
                    key={item.name}
                    className="block w-full text-left"
                    onClick={() =>
                      setSection(item.name)
                    }
                  >
                    <div className="flex justify-between text-sm">
                      <span>{item.name}</span>

                      <span>
                        {pct(item.accuracy)}
                      </span>
                    </div>

                    <div className="mt-1 h-3 rounded bg-slate-100">
                      <div
                        className="h-3 rounded bg-forge"
                        style={{
                          width: `${Math.min(
                            100,
                            item.accuracy
                          )}%`,
                        }}
                      />
                    </div>
                  </button>
                )
              )}

            </div>
          </div>

        </section>

        {/* =====================================================
            TOPIC ANALYSIS
        ====================================================== */}

        <section className="grid gap-5 lg:grid-cols-3">

          <div className="rounded-lg border border-line bg-white p-5 shadow-panel lg:col-span-2">

            <h2 className="text-lg font-semibold text-ink">
              Topic Analysis
            </h2>

            <div className="mt-4 grid gap-3 md:grid-cols-2">

              {result.analytics.topic_analysis.map(
                (item) => (
                  <button
                    key={item.name}
                    className="rounded-md border border-line p-3 text-left"
                    onClick={() =>
                      setTopic(item.name)
                    }
                  >
                    <div className="flex justify-between text-sm font-semibold text-ink">

                      <span>
                        {item.name}
                      </span>

                      <span>
                        {pct(item.accuracy)}
                      </span>

                    </div>

                    <div className="mt-1 text-xs text-steel">
                      {item.classification} |
                      {" "}
                      Avg time{" "}
                      {score(item.average_time)}s
                    </div>

                    <div className="mt-2 h-2 rounded bg-slate-100">
                      <div
                        className="h-2 rounded bg-accent"
                        style={{
                          width: `${Math.min(
                            100,
                            item.accuracy
                          )}%`,
                        }}
                      />
                    </div>
                  </button>
                )
              )}

            </div>
          </div>

          <div className="space-y-5">

            <AreaList
              title="Strong Areas"
              empty="No strong areas yet."
              items={result.analytics.strengths}
              onPick={setTopic}
            />

            <AreaList
              title="Weak Areas"
              empty="No weak areas yet."
              items={result.analytics.weaknesses}
              onPick={setTopic}
            />

          </div>
        </section>

        {/* =====================================================
            AI ASSISTANCE
        ====================================================== */}

        <section className="rounded-lg border border-line bg-white p-5 shadow-panel">

          <div className="flex flex-wrap items-center justify-between gap-3">

            <h2 className="text-lg font-semibold text-ink">
              AI Assistance
            </h2>

            <button
              className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-steel disabled:opacity-50"
              disabled={aiLoading}
              onClick={() => void generateReview()}
            >
              {aiLoading
                ? "Generating..."
                : "Generate AI Analysis"}
            </button>

          </div>

          {aiAnalysis ? (
            <pre className="mt-4 whitespace-pre-wrap rounded-md bg-[#fafbfc] p-4 text-sm text-steel">
              {JSON.stringify(
                aiAnalysis,
                null,
                2
              )}
            </pre>
          ) : (
            <p className="mt-3 text-sm text-steel">
              AI assistance is currently disabled.
              Local scoring and analytics are complete.
            </p>
          )}

        </section>

        {/* =====================================================
            DETAILED ANALYSIS
        ====================================================== */}

        <section className="rounded-lg border border-line bg-white p-5 shadow-panel">

          <div className="flex flex-wrap items-center justify-between gap-3">

            <h2 className="text-lg font-semibold text-ink">
              Detailed Analysis
            </h2>

            <div className="flex flex-wrap gap-2">

              <input
                className="focus-ring rounded-md border border-line px-3 py-2 text-sm"
                placeholder="Search questions"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />

              <select
                className="focus-ring rounded-md border border-line px-3 py-2 text-sm"
                value={filter}
                onChange={(event) =>
                  setFilter(
                    event.target.value as ReviewFilter
                  )
                }
              >
                {[
                  "all",
                  "correct",
                  "wrong",
                  "unattempted",
                  "marked",
                  "weak",
                ].map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ))}
              </select>

              <select
                className="focus-ring rounded-md border border-line px-3 py-2 text-sm"
                value={section}
                onChange={(event) =>
                  setSection(event.target.value)
                }
              >
                <option value="">
                  All sections
                </option>

                {sections.map((item) => (
                  <option
                    key={item.id}
                    value={item.name}
                  >
                    {item.name}
                  </option>
                ))}
              </select>

              <select
                className="focus-ring rounded-md border border-line px-3 py-2 text-sm"
                value={topic}
                onChange={(event) =>
                  setTopic(event.target.value)
                }
              >
                <option value="">
                  All topics
                </option>

                {topics.map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ))}
              </select>

            </div>
          </div>

          <div className="mt-5 space-y-4">

            {visibleQuestions.map((row) => (
              <QuestionReview
                key={row.question_id}
                row={row}
                question={questionById.get(
                  row.question_id
                )}
                message={
                  explanationMessages[
                    row.question_id
                  ]
                }
                onExplain={() =>
                  void explain(row.question_id)
                }
              />
            ))}

            {!visibleQuestions.length ? (
              <div className="rounded-md border border-line p-4 text-sm text-steel">
                No questions match this filter.
              </div>
            ) : null}

          </div>
        </section>

      </div>
    </main>
  );
}

/* ============================================================
   AREA LIST
============================================================ */

function AreaList({
  title,
  empty,
  items,
  onPick,
}: {
  title: string;
  empty: string;
  items: ResultPayload["analytics"]["strengths"];
  onPick: (topic: string) => void;
}) {
  return (
    <div className="rounded-lg border border-line bg-white p-5 shadow-panel">

      <h2 className="text-lg font-semibold text-ink">
        {title}
      </h2>

      <div className="mt-3 space-y-2">

        {items.map((item) => (
          <button
            key={item.name}
            className="flex w-full justify-between rounded-md border border-line px-3 py-2 text-sm"
            onClick={() =>
              onPick(item.name)
            }
          >
            <span>{item.name}</span>

            <span>
              {pct(item.accuracy)}
            </span>
          </button>
        ))}

        {!items.length ? (
          <div className="text-sm text-steel">
            {empty}
          </div>
        ) : null}

      </div>
    </div>
  );
}

/* ============================================================
   QUESTION REVIEW
============================================================ */

function QuestionReview({
  row,
  question,
  message,
  onExplain,
}: {
  row: QuestionResult;
  question?: ResultPayload["questions"][number];
  message?: string;
  onExplain: () => void;
}) {
  const status =
    row.status === "correct"
      ? "Correct"
      : row.status === "wrong"
        ? "Wrong"
        : "Unattempted";

  /*
   * IMPORTANT:
   *
   * marks can be null for questions that are pending
   * manual evaluation.
   *
   * Store it in a local variable so TypeScript can
   * correctly narrow the value to number.
   */
  const marks = row.marks;

  const marksDisplay =
    marks == null
      ? "Pending Evaluation"
      : `${marks >= 0 ? "+" : ""}${score(
          marks
        )}`;

  return (
    <article className="rounded-md border border-line p-4">

      <div className="flex flex-wrap justify-between gap-3">

        <h3 className="font-semibold text-ink">
          Question{" "}
          {row.question_number ??
            row.question_id}
        </h3>

        <div className="text-sm font-semibold text-ink">
          {status} | Marks {marksDisplay}
        </div>

      </div>

      {/* QUESTION TEXT */}

      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink">
        {question?.question_text}
      </p>

      {/* QUESTION IMAGES */}

      {question?.question_images.length ? (
        <div className="mt-3 grid gap-3 md:grid-cols-2">

          {question.question_images.map(
            (image) => (
              <img
                key={image.path}
                loading="lazy"
                className="max-h-72 rounded-md border border-line object-contain"
                src={imageUrl(image.path)}
                alt={
                  image.alt_text ??
                  "Question visual"
                }
              />
            )
          )}

        </div>
      ) : null}

      {/* ANSWERS */}

      <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">

        <div>
          Your Answer:{" "}
          <span className="font-semibold">
            {row.selected_answers.join(
              ", "
            ) || "Not Attempted"}
          </span>
        </div>

        <div>
          Correct Answer:{" "}
          <span className="font-semibold">
            {row.correct_answer.join(
              ", "
            ) || "-"}
          </span>
        </div>

        <div>
          Time:{" "}
          <span className="font-semibold">
            {row.time_spent_seconds}s
          </span>
        </div>

      </div>

      {/* METADATA */}

      <div className="mt-3 text-sm text-steel">
        Topic:{" "}
        {row.topic ?? "Uncategorized"} |
        {" "}
        Difficulty: {row.difficulty}
      </div>

      {/* EXPLANATION */}

      <div className="mt-3 rounded-md border border-line bg-[#fafbfc] p-3 text-sm text-steel">

        {question?.explanation?.text ||
          message ||
          "Explanation not provided."}

      </div>

      {/* EXPLANATION IMAGES */}

      {question?.explanation?.images.length ? (
        <div className="mt-3 grid gap-3 md:grid-cols-2">

          {question.explanation.images.map(
            (image) => (
              <img
                key={image.path}
                loading="lazy"
                className="max-h-72 rounded-md border border-line object-contain"
                src={imageUrl(image.path)}
                alt={
                  image.alt_text ??
                  "Explanation visual"
                }
              />
            )
          )}

        </div>
      ) : null}

      {/* AI EXPLANATION */}

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          className="rounded-md border border-line px-3 py-2 text-sm font-semibold text-ink hover:bg-slate-50"
          onClick={onExplain}
        >
          Explain with AI
        </button>
      </div>

      {!question?.explanation &&
      !message ? (
        <div className="mt-2 text-xs text-steel">
          No stored explanation is available.
        </div>
      ) : null}

    </article>
  );
}