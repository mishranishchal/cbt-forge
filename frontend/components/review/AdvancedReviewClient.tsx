// "use client";

// import Link from "next/link";
// import { useEffect, useMemo, useState } from "react";
// import { ErrorMessage } from "@/components/common/ErrorMessage";
// import { Loading } from "@/components/common/Loading";
// import { bulkUpdateQuestions, deleteQuestion, duplicateQuestion, getQuestions, imageUrl, organizeQuestions, reorderQuestions, updateQuestion } from "@/lib/api";
// import type { Question, ValidationStatus } from "@/lib/types";
// import { QuestionEditor } from "./QuestionEditor";

// type SortKey = "question_number" | "section" | "topic" | "difficulty" | "confidence" | "validation_status";

// function statusStyle(status: ValidationStatus) {
//   if (status === "valid") return "border-green-200 bg-green-50 text-green-700";
//   if (status === "error") return "border-red-200 bg-red-50 text-red-700";
//   return "border-amber-200 bg-amber-50 text-amber-700";
// }

// function confidenceLabel(value: number) {
//   if (value >= 0.9) return "High";
//   if (value >= 0.7) return "Medium";
//   return "Low";
// }

// export function AdvancedReviewClient({ testId }: { testId: string }) {
//   const [questions, setQuestions] = useState<Question[]>([]);
//   const [selectedId, setSelectedId] = useState<string>("");
//   const [draft, setDraft] = useState<Question | null>(null);
//   const [editing, setEditing] = useState(false);
//   const [selectedBulk, setSelectedBulk] = useState<Set<string>>(new Set());
//   const [search, setSearch] = useState("");
//   const [status, setStatus] = useState<"all" | ValidationStatus | "image" | "text" | "unanswered">("all");
//   const [section, setSection] = useState("");
//   const [topic, setTopic] = useState("");
//   const [difficulty, setDifficulty] = useState("");
//   const [questionType, setQuestionType] = useState("");
//   const [sortKey, setSortKey] = useState<SortKey>("question_number");
//   const [bulkSection, setBulkSection] = useState("");
//   const [bulkTopic, setBulkTopic] = useState("");
//   const [bulkDifficulty, setBulkDifficulty] = useState("");
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [error, setError] = useState("");
//   const [message, setMessage] = useState("");
//   const [dragId, setDragId] = useState<string | null>(null);

//   useEffect(() => {
//     async function load() {
//       try {
//         const loaded = await getQuestions(testId);
//         setQuestions(loaded);
//         setSelectedId(loaded[0]?.id ?? "");
//       } catch (err) {
//         setError(err instanceof Error ? err.message : "Could not load questions.");
//       } finally {
//         setLoading(false);
//       }
//     }
//     void load();
//   }, [testId]);

//   const selectedQuestion = useMemo(() => questions.find((question) => question.id === selectedId) ?? questions[0] ?? null, [questions, selectedId]);

//   useEffect(() => {
//     if (!editing) setDraft(selectedQuestion);
//   }, [selectedQuestion, editing]);

//   useEffect(() => {
//     function beforeUnload(event: BeforeUnloadEvent) {
//       if (editing) {
//         event.preventDefault();
//         event.returnValue = "You have unsaved changes.";
//       }
//     }
//     function onKeyDown(event: KeyboardEvent) {
//       const target = event.target as HTMLElement | null;
//       const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT";
//       if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
//         event.preventDefault();
//         if (draft) void saveDraft();
//       }
//       if (!typing && event.key === "ArrowDown") {
//         event.preventDefault();
//         moveSelection(1);
//       }
//       if (!typing && event.key === "ArrowUp") {
//         event.preventDefault();
//         moveSelection(-1);
//       }
//     }
//     window.addEventListener("beforeunload", beforeUnload);
//     window.addEventListener("keydown", onKeyDown);
//     return () => {
//       window.removeEventListener("beforeunload", beforeUnload);
//       window.removeEventListener("keydown", onKeyDown);
//     };
//   }, [editing, draft, questions, selectedId]);

//   const stats = useMemo(() => {
//     const valid = questions.filter((question) => question.validation_status === "valid").length;
//     const warnings = questions.filter((question) => question.validation_status === "warning").length;
//     const errors = questions.filter((question) => question.validation_status === "error").length;
//     const images = questions.filter((question) => question.question_images.length > 0 || question.question_type === "image_based").length;
//     return {
//       total: questions.length,
//       valid,
//       warnings,
//       errors,
//       images,
//       text: questions.length - images,
//       answered: questions.filter((question) => question.correct_answer?.length).length,
//       explained: questions.filter((question) => question.explanation).length,
//       sections: new Set(questions.map((question) => question.section).filter(Boolean)).size,
//       topics: new Set(questions.map((question) => question.topic).filter(Boolean)).size
//     };
//   }, [questions]);

//   const sections = Array.from(new Set(questions.map((question) => question.section).filter(Boolean) as string[])).sort();
//   const topics = Array.from(new Set(questions.map((question) => question.topic).filter(Boolean) as string[])).sort();

//   const visible = useMemo(() => {
//     const q = search.trim().toLowerCase();
//     return questions
//       .filter((question) => {
//         const haystack = [
//           question.question_number,
//           question.question_text,
//           question.explanation,
//           question.topic,
//           question.section,
//           ...question.options.map((option) => option.text)
//         ].join(" ").toLowerCase();
//         if (q && !haystack.includes(q)) return false;
//         if (status === "image" && !(question.question_images.length > 0 || question.question_type === "image_based")) return false;
//         if (status === "text" && (question.question_images.length > 0 || question.question_type === "image_based")) return false;
//         if (status === "unanswered" && question.correct_answer?.length) return false;
//         if (["valid", "warning", "error"].includes(status) && question.validation_status !== status) return false;
//         if (section && question.section !== section) return false;
//         if (topic && question.topic !== topic) return false;
//         if (difficulty && question.difficulty !== difficulty) return false;
//         if (questionType && question.question_type !== questionType) return false;
//         return true;
//       })
//       .sort((a, b) => String(a[sortKey] ?? "").localeCompare(String(b[sortKey] ?? ""), undefined, { numeric: true }));
//   }, [questions, search, status, section, topic, difficulty, questionType, sortKey]);

//   function selectQuestion(questionId: string) {
//     if (editing && !confirm("You have unsaved changes. Discard them?")) return;
//     setEditing(false);
//     setSelectedId(questionId);
//   }

//   function moveSelection(delta: number) {
//     const index = visible.findIndex((question) => question.id === selectedId);
//     const next = visible[index + delta];
//     if (next) selectQuestion(next.id);
//   }

//   async function saveDraft() {
//     if (!draft) return;
//     setSaving(true);
//     setMessage("");
//     try {
//       const saved = await updateQuestion(draft);
//       setQuestions((current) => current.map((question) => (question.id === saved.id ? saved : question)));
//       setDraft(saved);
//       setEditing(false);
//       setMessage("Question saved.");
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Question save failed.");
//     } finally {
//       setSaving(false);
//     }
//   }

//   async function duplicateSelected() {
//     if (!selectedQuestion) return;
//     const copy = await duplicateQuestion(selectedQuestion.id);
//     setQuestions(await getQuestions(testId));
//     setSelectedId(copy.id);
//     setMessage("Question duplicated.");
//   }

//   async function deleteSelected() {
//     if (!selectedQuestion) return;
//     if (!confirm(`Delete Question ${selectedQuestion.question_number ?? selectedQuestion.id}? This cannot be undone unless restored.`)) return;
//     await deleteQuestion(selectedQuestion.id);
//     const remaining = questions.filter((question) => question.id !== selectedQuestion.id);
//     setQuestions(remaining);
//     setSelectedId(remaining[0]?.id ?? "");
//   }

//   async function applyBulk() {
//     const ids = Array.from(selectedBulk);
//     if (!ids.length) return;
//     const updated = await bulkUpdateQuestions({ question_ids: ids, section: bulkSection || undefined, topic: bulkTopic || undefined, difficulty: bulkDifficulty || undefined });
//     setQuestions((current) => current.map((question) => updated.find((item) => item.id === question.id) ?? question));
//     setSelectedBulk(new Set());
//     setMessage("Bulk update saved.");
//   }

//   async function deleteBulk() {
//     const ids = Array.from(selectedBulk);
//     if (!ids.length || !confirm(`Delete ${ids.length} selected questions?`)) return;
//     for (const id of ids) await deleteQuestion(id);
//     setQuestions((current) => current.filter((question) => !selectedBulk.has(question.id)));
//     setSelectedBulk(new Set());
//   }

//   async function persistReorder(nextQuestions: Question[]) {
//     setQuestions(nextQuestions);
//     const saved = await reorderQuestions(testId, nextQuestions.map((question) => question.id));
//     setQuestions(saved);
//   }

//   async function organize() {
//     setSaving(true);
//     try {
//       const organized = await organizeQuestions(testId);
//       setQuestions(organized);
//       setMessage("Missing metadata organized.");
//     } finally {
//       setSaving(false);
//     }
//   }

//   if (loading) return <main className="min-h-screen bg-[#f7f8fb] p-5"><Loading label="Loading review" /></main>;

//   return (
//     <main className="min-h-screen bg-[#f7f8fb] px-4 py-5">
//       <div className="mx-auto max-w-7xl space-y-5">
//         <header className="rounded-lg border border-line bg-white p-5 shadow-panel">
//           <div className="flex flex-wrap items-start justify-between gap-4">
//             <div>
//               <div className="text-sm font-semibold uppercase text-accent">CBT Forge</div>
//               <h1 className="mt-1 text-2xl font-semibold text-ink">Question Review</h1>
//               <p className="mt-1 text-sm text-steel">Test {testId}</p>
//             </div>
//             <div className="flex flex-wrap gap-2">
//               <button className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-ink" onClick={() => draft && void saveDraft()} disabled={!editing || saving}>Save</button>
//               <button className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-forge" onClick={organize} disabled={saving}>Organize Questions</button>
//               <Link className="rounded-md bg-forge px-4 py-2 text-sm font-semibold text-white" href={`/configure/${testId}`}>Configure Test</Link>
//             </div>
//           </div>
//           <div className="mt-5 grid gap-3 md:grid-cols-8">
//             {[
//               ["Questions", stats.total],
//               ["Valid", stats.valid],
//               ["Warnings", stats.warnings],
//               ["Errors", stats.errors],
//               ["Images", stats.images],
//               ["Sections", stats.sections],
//               ["Topics", stats.topics],
//               ["Unanswered", stats.total - stats.answered]
//             ].map(([label, value]) => (
//               <div key={label} className="rounded-md border border-line bg-[#fafbfc] p-3">
//                 <div className="text-xs uppercase text-steel">{label}</div>
//                 <div className="mt-1 text-lg font-semibold text-ink">{value}</div>
//               </div>
//             ))}
//           </div>
//         </header>

//         {error ? <ErrorMessage message={error} /> : null}
//         {message ? <div className="rounded-md border border-line bg-white px-4 py-3 text-sm text-steel">{message}</div> : null}

//         <section className="grid gap-5 lg:grid-cols-[320px_1fr]">
//           <aside className="space-y-4">
//             <div className="rounded-lg border border-line bg-white p-4 shadow-panel">
//               <input className="focus-ring w-full rounded-md border border-line px-3 py-2 text-sm" placeholder="Search questions" value={search} onChange={(event) => setSearch(event.target.value)} />
//               <div className="mt-3 grid grid-cols-2 gap-2">
//                 <select className="focus-ring rounded-md border border-line px-2 py-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
//                   {["all", "valid", "warning", "error", "image", "text", "unanswered"].map((item) => <option key={item} value={item}>{item}</option>)}
//                 </select>
//                 <select className="focus-ring rounded-md border border-line px-2 py-2 text-sm" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
//                   {["question_number", "section", "topic", "difficulty", "confidence", "validation_status"].map((item) => <option key={item} value={item}>{item}</option>)}
//                 </select>
//                 <select className="focus-ring rounded-md border border-line px-2 py-2 text-sm" value={section} onChange={(event) => setSection(event.target.value)}><option value="">All sections</option>{sections.map((item) => <option key={item}>{item}</option>)}</select>
//                 <select className="focus-ring rounded-md border border-line px-2 py-2 text-sm" value={topic} onChange={(event) => setTopic(event.target.value)}><option value="">All topics</option>{topics.map((item) => <option key={item}>{item}</option>)}</select>
//                 <select className="focus-ring rounded-md border border-line px-2 py-2 text-sm" value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option value="">All difficulty</option>{["easy", "medium", "hard", "unknown"].map((item) => <option key={item}>{item}</option>)}</select>
//                 <select className="focus-ring rounded-md border border-line px-2 py-2 text-sm" value={questionType} onChange={(event) => setQuestionType(event.target.value)}><option value="">All types</option>{["single_choice", "multiple_choice", "true_false", "image_based", "unknown"].map((item) => <option key={item}>{item}</option>)}</select>
//               </div>
//             </div>

//             <div className="max-h-[620px] overflow-auto rounded-lg border border-line bg-white p-3 shadow-panel">
//               <div className="mb-2 text-sm font-semibold text-ink">Questions</div>
//               <div className="space-y-2">
//                 {visible.map((question) => (
//                   <button
//                     key={question.id}
//                     draggable
//                     onDragStart={() => setDragId(question.id)}
//                     onDragOver={(event) => event.preventDefault()}
//                     onDrop={() => {
//                       if (!dragId || dragId === question.id) return;
//                       const current = [...questions];
//                       const from = current.findIndex((item) => item.id === dragId);
//                       const to = current.findIndex((item) => item.id === question.id);
//                       const [moved] = current.splice(from, 1);
//                       current.splice(to, 0, moved);
//                       void persistReorder(current);
//                     }}
//                     className={`flex w-full items-center gap-2 rounded-md border px-2 py-2 text-left text-sm ${selectedId === question.id ? "border-forge bg-[#eef7f8]" : "border-line bg-white hover:bg-[#fafbfc]"}`}
//                     onClick={() => selectQuestion(question.id)}
//                   >
//                     <input type="checkbox" checked={selectedBulk.has(question.id)} onClick={(event) => event.stopPropagation()} onChange={(event) => {
//                       const next = new Set(selectedBulk);
//                       if (event.target.checked) next.add(question.id); else next.delete(question.id);
//                       setSelectedBulk(next);
//                     }} />
//                     <span className={`rounded border px-1.5 py-0.5 text-xs ${statusStyle(question.validation_status)}`}>{question.validation_status === "valid" ? "OK" : question.validation_status === "warning" ? "!" : "ERR"}</span>
//                     <span className="font-medium text-ink">{String(question.question_number ?? "-").padStart(2, "0")}</span>
//                     {question.question_images.length ? <span title={`${question.question_images.length} image(s)`}>IMG {question.question_images.length}</span> : question.question_type === "image_based" ? <span title="Image question">IMG</span> : null}
//                     <span className="truncate text-steel">{question.section ?? question.topic ?? "Unsorted"}</span>
//                   </button>
//                 ))}
//               </div>
//             </div>

//             <div className="rounded-lg border border-line bg-white p-4 shadow-panel">
//               <div className="text-sm font-semibold text-ink">Bulk Operations</div>
//               <div className="mt-3 grid gap-2">
//                 <input className="focus-ring rounded-md border border-line px-3 py-2 text-sm" placeholder="Section" value={bulkSection} onChange={(event) => setBulkSection(event.target.value)} />
//                 <input className="focus-ring rounded-md border border-line px-3 py-2 text-sm" placeholder="Topic" value={bulkTopic} onChange={(event) => setBulkTopic(event.target.value)} />
//                 <select className="focus-ring rounded-md border border-line px-3 py-2 text-sm" value={bulkDifficulty} onChange={(event) => setBulkDifficulty(event.target.value)}><option value="">Difficulty</option>{["easy", "medium", "hard", "unknown"].map((item) => <option key={item}>{item}</option>)}</select>
//                 <button className="rounded-md bg-forge px-3 py-2 text-sm font-semibold text-white" onClick={applyBulk}>Apply to selected ({selectedBulk.size})</button>
//                 <button className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700" onClick={deleteBulk}>Delete selected</button>
//               </div>
//             </div>
//           </aside>

//           <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
//             {!selectedQuestion || !draft ? <div className="text-sm text-steel">No question selected.</div> : (
//               <div>
//                 <div className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
//                   <div>
//                     <h2 className="text-xl font-semibold text-ink">Question {selectedQuestion.question_number ?? "Unnumbered"}</h2>
//                     <div className="mt-1 text-sm text-steel">Source page: {selectedQuestion.source_page ?? "-"} | AI Confidence: {(selectedQuestion.confidence * 100).toFixed(0)}% ({confidenceLabel(selectedQuestion.confidence)})</div>
//                   </div>
//                   <span className={`rounded-md border px-3 py-1 text-xs font-semibold uppercase ${statusStyle(selectedQuestion.validation_status)}`}>{selectedQuestion.validation_status}</span>
//                 </div>

//                 {editing ? (
//                   <div>
//                     <QuestionEditor question={draft} testId={testId} onChange={setDraft} />
//                     <div className="mt-5 flex flex-wrap gap-3">
//                       <button className="rounded-md bg-forge px-4 py-2 text-sm font-semibold text-white" onClick={saveDraft} disabled={saving}>Save Changes</button>
//                       <button className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-ink" onClick={() => { setDraft(selectedQuestion); setEditing(false); }}>Cancel</button>
//                     </div>
//                   </div>
//                 ) : (
//                   <div className="space-y-5">
//                     <div><div className="text-xs font-semibold uppercase text-steel">Question text</div><p className="mt-2 whitespace-pre-wrap text-base text-ink">{selectedQuestion.question_text}</p></div>
//                     {selectedQuestion.question_images.length ? <div className="grid gap-3 md:grid-cols-2">{selectedQuestion.question_images.map((image) => <a key={image.path} href={imageUrl(image.path)} target="_blank"><img loading="lazy" className="max-h-80 w-full rounded-md border border-line object-contain" src={imageUrl(image.path)} alt="Question visual" /></a>)}</div> : null}
//                     <div><div className="text-xs font-semibold uppercase text-steel">Options</div><div className="mt-2 space-y-2">{selectedQuestion.options.map((option) => <div key={option.id} className="rounded-md border border-line p-3 text-sm"><span className="font-semibold">{option.id}.</span> {option.text}{option.images?.length ? <div className="mt-2 grid grid-cols-2 gap-2">{option.images.map((image) => <img key={image.path} className="max-h-32 w-full object-contain" src={imageUrl(image.path)} alt={`Option ${option.id}`} />)}</div> : null}</div>)}</div></div>
//                     <div className="grid gap-4 md:grid-cols-2">
//                       <div><div className="text-xs font-semibold uppercase text-steel">Correct Answer</div><div className="mt-1 font-semibold text-ink">{selectedQuestion.correct_answer?.join(", ") ?? "Unanswered"}</div></div>
//                       <div><div className="text-xs font-semibold uppercase text-steel">Metadata</div><div className="mt-1 text-sm text-steel">Section: {selectedQuestion.section ?? "-"} | Topic: {selectedQuestion.topic ?? "-"} | Subtopic: {selectedQuestion.subtopic ?? "-"} | Difficulty: {selectedQuestion.difficulty} | Type: {selectedQuestion.question_type}</div></div>
//                     </div>
//                     <div><div className="text-xs font-semibold uppercase text-steel">Explanation</div><p className="mt-2 whitespace-pre-wrap text-sm text-steel">{selectedQuestion.explanation?.text ?? "Explanation not provided."}</p>{selectedQuestion.explanation?.images.length ? <div className="mt-2 grid gap-2 md:grid-cols-2">{selectedQuestion.explanation.images.map((image) => <img key={image.path} className="max-h-64 w-full object-contain" src={imageUrl(image.path)} alt="Explanation visual" />)}</div> : null}</div>
//                     {selectedQuestion.warnings.length ? <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{selectedQuestion.warnings.map((warning) => <button key={warning} className="block text-left" onClick={() => setSelectedId(selectedQuestion.id)}>{warning}</button>)}</div> : null}
//                     <div className="flex flex-wrap gap-3">
//                       <button className="rounded-md bg-forge px-4 py-2 text-sm font-semibold text-white" onClick={() => setEditing(true)}>Edit</button>
//                       <button className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-ink" onClick={duplicateSelected}>Duplicate</button>
//                       <button className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-ink" onClick={() => moveSelection(1)}>Move</button>
//                       <button className="rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-700" onClick={deleteSelected}>Delete</button>
//                     </div>
//                   </div>
//                 )}
//               </div>
//             )}
//           </section>
//         </section>
//       </div>
//     </main>
//   );
// }



"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { bulkUpdateQuestions, createQuestion, deleteQuestion, duplicateQuestion, getQuestions, imageUrl, organizeQuestions, reorderQuestions, updateQuestion } from "@/lib/api";
import type { Question, ValidationStatus } from "@/lib/types";
import { QuestionEditor } from "./QuestionEditor";

const types = ["single_choice","multiple_choice","multiple_select","true_false","integer","real_number","numerical_tolerance","short_answer","long_answer","image_based","unknown"];

function badge(s: ValidationStatus) {
  return s === "valid" ? "border-green-200 bg-green-50 text-green-700" : s === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-700";
}

export function AdvancedReviewClient({ testId }: { testId: string }) {
  const [questions,setQuestions]=useState<Question[]>([]);
  const [selectedId,setSelectedId]=useState("");
  const [draft,setDraft]=useState<Question|null>(null);
  const [editing,setEditing]=useState(false);
  const [selectedBulk,setSelectedBulk]=useState<Set<string>>(new Set());
  const [search,setSearch]=useState("");
  const [status,setStatus]=useState("all");
  const [section,setSection]=useState("");
  const [topic,setTopic]=useState("");
  const [difficulty,setDifficulty]=useState("");
  const [questionType,setQuestionType]=useState("");
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");

  useEffect(()=>{void load();},[testId]);
  async function load(){try{const q=await getQuestions(testId);setQuestions(q);setSelectedId(q[0]?.id??"");}catch(e){setError(e instanceof Error?e.message:"Could not load questions.");}finally{setLoading(false);}}
  const selected=questions.find(q=>q.id===selectedId)??questions[0]??null;
  useEffect(()=>{if(!editing)setDraft(selected);},[selected,editing]);

  const sections=Array.from(new Set(questions.map(q=>q.section).filter(Boolean) as string[])).sort();
  const topics=Array.from(new Set(questions.map(q=>q.topic).filter(Boolean) as string[])).sort();

  const visible=useMemo(()=>questions.filter(q=>{
    const hay=[q.question_number,q.question_text,q.section,q.topic,q.subtopic,...q.options.map(o=>o.text)].join(" ").toLowerCase();
    if(search&&!hay.includes(search.toLowerCase()))return false;
    if(status==="image"&&!q.question_images.length&&q.question_type!=="image_based")return false;
    if(status==="text"&&(q.question_images.length||q.question_type==="image_based"))return false;
    if(status==="unanswered"&&q.answer_config.correct_answers.length)return false;
    if(["valid","warning","error"].includes(status)&&q.validation_status!==status)return false;
    if(section&&q.section!==section)return false;
    if(topic&&q.topic!==topic)return false;
    if(difficulty&&q.difficulty!==difficulty)return false;
    if(questionType&&q.question_type!==questionType)return false;
    return true;
  }),[questions,search,status,section,topic,difficulty,questionType]);

  async function saveDraft(){
    if(!draft)return;
    setSaving(true);setError("");
    try{const saved=await updateQuestion(draft);setQuestions(x=>x.map(q=>q.id===saved.id?saved:q));setDraft(saved);setEditing(false);setMessage("Question saved.");}
    catch(e){setError(e instanceof Error?e.message:"Question save failed.");}
    finally{setSaving(false);}
  }

  async function organize(){setSaving(true);try{setQuestions(await organizeQuestions(testId));setMessage("Questions organized.");}catch(e){setError(e instanceof Error?e.message:"Organization failed.");}finally{setSaving(false);}}
  async function addQuestion(){setSaving(true);setError("");try{const created=await createQuestion(testId);const next=await getQuestions(testId);setQuestions(next);setSelectedId(created.id);setDraft(created);setEditing(true);setMessage("New question added. Complete its type, answer, marking, and content.");}catch(e){setError(e instanceof Error?e.message:"Could not add question.");}finally{setSaving(false);}}
  async function duplicate(){if(!selected)return;try{const copy=await duplicateQuestion(selected.id);setQuestions(await getQuestions(testId));setSelectedId(copy.id);}catch(e){setError(e instanceof Error?e.message:"Duplicate failed.");}}
  async function remove(){if(!selected||!confirm("Delete this question?"))return;try{await deleteQuestion(selected.id);const q=questions.filter(x=>x.id!==selected.id);setQuestions(q);setSelectedId(q[0]?.id??"");}catch(e){setError(e instanceof Error?e.message:"Delete failed.");}}
  async function bulk(){const ids=[...selectedBulk];if(!ids.length)return;try{const updated=await bulkUpdateQuestions({question_ids:ids,section:section||undefined,topic:topic||undefined,difficulty:difficulty||undefined});setQuestions(q=>q.map(x=>updated.find(y=>y.id===x.id)??x));setSelectedBulk(new Set());setMessage("Bulk update saved.");}catch(e){setError(e instanceof Error?e.message:"Bulk update failed.");}}
  async function reorder(id:string){const q=[...questions];const from=q.findIndex(x=>x.id===id);if(from<1)return;[q[from-1],q[from]]=[q[from],q[from-1]];setQuestions(q);try{setQuestions(await reorderQuestions(testId,q.map(x=>x.id)));}catch(e){setError(e instanceof Error?e.message:"Reorder failed.");}}

  if(loading)return <main className="p-5"><div className="rounded border border-line bg-white p-5">Loading review...</div></main>;

  return <main className="min-h-screen bg-[#f7f8fb] px-4 py-5"><div className="mx-auto max-w-7xl space-y-5">
    <header className="rounded-lg border border-line bg-white p-5 shadow-panel">
      <div className="flex flex-wrap justify-between gap-3"><div><div className="text-sm font-semibold uppercase text-accent">CBT Forge</div><h1 className="text-2xl font-semibold">Question Review</h1><p className="text-sm text-steel">Test {testId}</p></div><div className="flex gap-2"><button className="rounded border border-line px-3 py-2 text-sm" disabled={saving} onClick={()=>void addQuestion()}>Add Question</button><button className="rounded border border-line px-3 py-2 text-sm" disabled={!editing||saving} onClick={()=>void saveDraft()}>Save</button><button className="rounded border border-line px-3 py-2 text-sm" disabled={saving} onClick={()=>void organize()}>Organize</button><Link className="rounded bg-forge px-3 py-2 text-sm text-white" href={`/configure/${testId}`}>Configure</Link></div></div>
      <div className="mt-4 grid gap-3 md:grid-cols-6"><Stat label="Questions" value={questions.length}/><Stat label="Valid" value={questions.filter(q=>q.validation_status==="valid").length}/><Stat label="Warnings" value={questions.filter(q=>q.validation_status==="warning").length}/><Stat label="Errors" value={questions.filter(q=>q.validation_status==="error").length}/><Stat label="Answered Keys" value={questions.filter(q=>q.answer_config.correct_answers.length).length}/><Stat label="Images" value={questions.filter(q=>q.question_images.length||q.question_type==="image_based").length}/></div>
    </header>
    {error&&<div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {message&&<div className="rounded border border-line bg-white p-3 text-sm">{message}</div>}
    <div className="grid gap-5 lg:grid-cols-[330px_1fr]">
      <aside className="space-y-4">
        <div className="rounded-lg border border-line bg-white p-4 shadow-panel">
          <input className="w-full rounded border border-line px-3 py-2 text-sm" placeholder="Search questions" value={search} onChange={e=>setSearch(e.target.value)}/>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <select className="rounded border border-line px-2 py-2 text-sm" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All status</option>{["valid","warning","error","image","text","unanswered"].map(x=><option key={x}>{x}</option>)}</select>
            <select className="rounded border border-line px-2 py-2 text-sm" value={difficulty} onChange={e=>setDifficulty(e.target.value)}><option value="">All difficulty</option>{["easy","medium","hard","unknown"].map(x=><option key={x}>{x}</option>)}</select>
            <select className="rounded border border-line px-2 py-2 text-sm" value={section} onChange={e=>setSection(e.target.value)}><option value="">All sections</option>{sections.map(x=><option key={x}>{x}</option>)}</select>
            <select className="rounded border border-line px-2 py-2 text-sm" value={topic} onChange={e=>setTopic(e.target.value)}><option value="">All topics</option>{topics.map(x=><option key={x}>{x}</option>)}</select>
            <select className="col-span-2 rounded border border-line px-2 py-2 text-sm" value={questionType} onChange={e=>setQuestionType(e.target.value)}><option value="">All question types</option>{types.map(x=><option key={x}>{x}</option>)}</select>
          </div>
        </div>
        <div className="max-h-[620px] overflow-auto rounded-lg border border-line bg-white p-3 shadow-panel">{visible.map(q=><button key={q.id} className={`mb-2 flex w-full items-center gap-2 rounded border p-2 text-left ${selectedId===q.id?"border-forge bg-[#eef7f8]":"border-line"}`} onClick={()=>{if(editing&&!confirm("Discard unsaved changes?"))return;setEditing(false);setSelectedId(q.id);}}><input type="checkbox" checked={selectedBulk.has(q.id)} onClick={e=>e.stopPropagation()} onChange={e=>{const n=new Set(selectedBulk);e.target.checked?n.add(q.id):n.delete(q.id);setSelectedBulk(n);}}/><span className={`rounded border px-1 text-xs ${badge(q.validation_status)}`}>{q.validation_status}</span><span className="font-semibold">{q.question_number??"-"}</span><span className="truncate text-xs text-steel">{q.question_type}</span></button>)}</div>
        <div className="rounded-lg border border-line bg-white p-4 shadow-panel"><div className="text-sm font-semibold">Bulk Operations</div><button className="mt-3 w-full rounded bg-forge px-3 py-2 text-sm text-white" onClick={()=>void bulk()}>Apply current filters to selected ({selectedBulk.size})</button></div>
      </aside>
      <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
        {!selected||!draft?<div>No question selected.</div>:editing?<><QuestionEditor question={draft} testId={testId} onChange={setDraft}/><div className="mt-5 flex gap-2"><button className="rounded bg-forge px-4 py-2 text-white" disabled={saving} onClick={()=>void saveDraft()}>Save Changes</button><button className="rounded border border-line px-4 py-2" onClick={()=>{setDraft(selected);setEditing(false)}}>Cancel</button></div></>:<div className="space-y-5">
          <div className="flex justify-between gap-3 border-b border-line pb-4"><div><h2 className="text-xl font-semibold">Question {selected.question_number??"-"}</h2><div className="text-sm text-steel">Type: {selected.question_type} | Source page: {selected.source_page??"-"}</div></div><span className={`rounded border px-2 py-1 text-xs ${badge(selected.validation_status)}`}>{selected.validation_status}</span></div>
          <p className="whitespace-pre-wrap leading-7">{selected.question_text}</p>
          {selected.question_images.length>0&&<div className="grid gap-3 md:grid-cols-2">{selected.question_images.map(i=><img key={i.path} className="max-h-80 w-full object-contain" src={imageUrl(i.path)} alt={i.alt_text??"Question visual"}/>)}</div>}
          {selected.options.length>0&&<div><div className="text-xs font-semibold uppercase text-steel">Options</div>{selected.options.map(o=><div key={o.id} className="mt-2 rounded border border-line p-3"><b>{o.id}.</b> {o.text}</div>)}</div>}
          <div className="grid gap-3 md:grid-cols-2"><div className="rounded border border-line p-3"><div className="text-xs uppercase text-steel">Correct answer(s)</div><div className="font-semibold">{selected.answer_config.correct_answers.join(", ")||"Not configured"}</div></div><div className="rounded border border-line p-3"><div className="text-xs uppercase text-steel">Answer mode</div><div>{selected.answer_config.input_mode??"Not specified"} / {selected.answer_config.evaluation}</div></div></div>
          <div className="rounded border border-line p-3"><div className="text-xs uppercase text-steel">Marking</div><div>Correct: {selected.marking.correct} | Incorrect: {selected.marking.incorrect} | Unattempted: {selected.marking.unattempted} | Maximum: {selected.marking.maximum_marks??selected.marking.correct}</div></div>
          <div><div className="text-xs font-semibold uppercase text-steel">Explanation</div><p className="mt-2 whitespace-pre-wrap text-sm text-steel">{selected.explanation?.text??"Explanation not provided."}</p></div>
          <div className="flex flex-wrap gap-2"><button className="rounded bg-forge px-4 py-2 text-white" onClick={()=>setEditing(true)}>Edit</button><button className="rounded border border-line px-4 py-2" onClick={()=>void duplicate()}>Duplicate</button><button className="rounded border border-line px-4 py-2" onClick={()=>void reorder(selected.id)}>Move Up</button><button className="rounded border border-red-200 px-4 py-2 text-red-700" onClick={()=>void remove()}>Delete</button></div>
        </div>}
      </section>
    </div>
  </div></main>
}
function Stat({label,value}:{label:string;value:number|string}){return <div className="rounded border border-line bg-[#fafbfc] p-3"><div className="text-xs uppercase text-steel">{label}</div><div className="text-lg font-semibold">{value}</div></div>}
