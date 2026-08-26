// "use client";

// import { useEffect, useMemo, useRef, useState } from "react";
// import { useRouter } from "next/navigation";
// import { createAttempt,getAttempt,getConfiguration,getQuestions,imageUrl,recordAttemptEvent,saveAttemptResponse,submitAttempt } from "@/lib/api";
// import type { Attempt,AttemptResponse,Question,RuntimeStatus,TestConfiguration,TestSection } from "@/lib/types";
// import { ErrorMessage } from "@/components/common/ErrorMessage";
// import { Loading } from "@/components/common/Loading";

// const labels:Record<RuntimeStatus,string>={NOT_VISITED:"Not Visited",NOT_ANSWERED:"Not Answered",ANSWERED:"Answered",MARKED_FOR_REVIEW:"Marked",ANSWERED_AND_MARKED:"Answered + Marked"};
// function time(s:number){s=Math.max(0,Math.floor(s));return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;}
// function status(r?:AttemptResponse):RuntimeStatus{return r?.status??"NOT_VISITED";}
// function statusClass(s:RuntimeStatus){if(s==="ANSWERED")return"border-green-300 bg-green-50 text-green-800";if(s==="MARKED_FOR_REVIEW")return"border-violet-300 bg-violet-50 text-violet-800";if(s==="ANSWERED_AND_MARKED")return"border-indigo-300 bg-indigo-50 text-indigo-800";if(s==="NOT_ANSWERED")return"border-amber-300 bg-amber-50 text-amber-800";return"border-slate-300 bg-white text-slate-600";}
// function sectionQuestions(s:TestSection|undefined,qs:Question[]){const m=new Map(qs.map(q=>[q.id,q]));return(s?.question_ids??[]).map(id=>m.get(id)).filter(Boolean) as Question[];}
// function choice(q:Question){return["single_choice","multiple_choice","multiple_select","true_false","image_based"].includes(q.question_type);}
// function multi(q:Question){return q.question_type==="multiple_choice"||q.question_type==="multiple_select";}
// function answered(r?:AttemptResponse){return !!r&&(r.selected_answers.length>0||!!r.numeric_value?.trim()||!!r.text_answer?.trim());}

// export function TestClient({testId}:{testId:string}){
//  const router=useRouter();
//  const [configuration,setConfiguration]=useState<TestConfiguration|null>(null),[startQuestions,setStartQuestions]=useState<Question[]>([]),[attempt,setAttempt]=useState<Attempt|null>(null);
//  const [accepted,setAccepted]=useState(false),[loading,setLoading]=useState(true),[starting,setStarting]=useState(false),[saving,setSaving]=useState(false),[lost,setLost]=useState(false),[error,setError]=useState(""),[showSubmit,setShowSubmit]=useState(false),[submitting,setSubmitting]=useState(false),[remaining,setRemaining]=useState(0);
//  const entered=useRef(Date.now()),timer=useRef<ReturnType<typeof setTimeout>|null>(null),submittingRef=useRef(false);

//  useEffect(()=>{async function load(){try{const[c,q]=await Promise.all([getConfiguration(testId),getQuestions(testId)]);setConfiguration(c);setStartQuestions(q);const id=localStorage.getItem(`cbt-forge-attempt-${testId}`);if(id){try{const a=await getAttempt(id);if(a.status==="IN_PROGRESS"){setAttempt(a);setRemaining(a.remaining_time_seconds);}}catch{localStorage.removeItem(`cbt-forge-attempt-${testId}`);}}}catch(e){setError(e instanceof Error?e.message:"Unable to load test.");}finally{setLoading(false);}}void load();},[testId]);

//  useEffect(()=>{if(!attempt||attempt.status!=="IN_PROGRESS")return;const started=Date.now(),initial=attempt.remaining_time_seconds;const i=window.setInterval(()=>{const r=Math.max(0,initial-Math.floor((Date.now()-started)/1000));setRemaining(r);if(r<=0&&!submittingRef.current){clearInterval(i);void submit("TIMEOUT");}},1000);return()=>clearInterval(i);},[attempt?.attempt_id,attempt?.remaining_time_seconds]);

//  useEffect(()=>{if(!attempt)return;const id=attempt.attempt_id;const fn=()=>void recordAttemptEvent(id,document.hidden?"TAB_HIDDEN":"TAB_VISIBLE");document.addEventListener("visibilitychange",fn);return()=>document.removeEventListener("visibilitychange",fn);},[attempt?.attempt_id]);

//  const section=useMemo(()=>attempt?.configuration.sections.find(s=>s.id===attempt.current_section)??attempt?.configuration.sections[0],[attempt]);
//  const questions=attempt?.questions??startQuestions;
//  const sectionQs=sectionQuestions(section,questions);
//  const current=useMemo(()=>questions.find(q=>q.id===attempt?.current_question)??sectionQs[0]??questions[0],[questions,sectionQs,attempt?.current_question]);
//  const response=current&&attempt?attempt.responses[current.id]:undefined;
//  const progress=useMemo(()=>attempt?attempt.configuration.sections.map(s=>{const ids=new Set(s.question_ids);const n=Object.values(attempt.responses).filter(r=>ids.has(r.question_id)&&answered(r)).length;return{section:s,answered:n,total:s.question_ids.length};}):[],[attempt]);

//  function local(a:Attempt){localStorage.setItem(`cbt-forge-local-${a.attempt_id}`,JSON.stringify(a.responses));}
//  function apply(id:string,selected:string[],marked=response?.marked_for_review??false,sectionId=attempt?.current_section??null,extra:{numeric_value?:string|null;text_answer?:string|null}={}){
//   if(!attempt)return;const old=attempt.responses[id];const has=selected.length>0||!!extra.numeric_value?.trim()||!!extra.text_answer?.trim();const r:AttemptResponse={attempt_id:attempt.attempt_id,question_id:id,selected_answers:selected,numeric_value:extra.numeric_value??old?.numeric_value??null,text_answer:extra.text_answer??old?.text_answer??null,visited:true,marked_for_review:marked,status:marked&&has?"ANSWERED_AND_MARKED":marked?"MARKED_FOR_REVIEW":has?"ANSWERED":"NOT_ANSWERED",time_spent_seconds:Math.max(Math.floor((Date.now()-entered.current)/1000),old?.time_spent_seconds??0),last_updated:new Date().toISOString()};const next={...attempt,current_section:sectionId,current_question:id,responses:{...attempt.responses,[id]:r}};setAttempt(next);local(next);if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>void persist(r,sectionId,id,attempt.attempt_id),450);}
//  async function persist(r:AttemptResponse,sectionId:string|null,id:string,attemptId:string){setSaving(true);try{await saveAttemptResponse(attemptId,id,{selected_answers:r.selected_answers,numeric_value:r.numeric_value??null,text_answer:r.text_answer??null,visited:r.visited,marked_for_review:r.marked_for_review,time_spent_seconds:r.time_spent_seconds,last_updated:r.last_updated,current_section:sectionId,current_question:id});setLost(false);}catch{setLost(true);}finally{setSaving(false);}}
//  function choose(id:string){if(!current)return;const s=response?.selected_answers??[];apply(current.id,multi(current)?(s.includes(id)?s.filter(x=>x!==id):[...s,id]):[id]);}
//  function go(id:string,sectionId=attempt?.current_section??null){if(!attempt)return;if(current)apply(current.id,response?.selected_answers??[],response?.marked_for_review??false,attempt.current_section,{numeric_value:response?.numeric_value??null,text_answer:response?.text_answer??null});entered.current=Date.now();const old=attempt.responses[id];if(!old)apply(id,[],false,sectionId);else setAttempt({...attempt,current_question:id,current_section:sectionId,responses:{...attempt.responses,[id]:{...old,visited:true,status:old.status==="NOT_VISITED"?"NOT_ANSWERED":old.status}}});}
//  function move(d:number){if(!current)return;const i=sectionQs.findIndex(q=>q.id===current.id);const n=sectionQs[i+d];if(n)go(n.id,section?.id??null);}
//  function switchSection(s:TestSection){if(!attempt)return;if(!attempt.configuration.test.navigation.section_switching&&s.id!==attempt.current_section){setError("Section switching is disabled.");return;}const q=sectionQuestions(s,attempt.questions)[0];if(q)go(q.id,s.id);}
//  async function start(){setStarting(true);setError("");try{const a=await createAttempt(testId,true);localStorage.setItem(`cbt-forge-attempt-${testId}`,a.attempt_id);setAttempt(a);setRemaining(a.remaining_time_seconds);entered.current=Date.now();}catch(e){setError(e instanceof Error?e.message:"Test could not be started.");}finally{setStarting(false);}}
//  async function submit(reason:"MANUAL"|"TIMEOUT"|"SECTION_TIMEOUT"="MANUAL"){if(!attempt||submittingRef.current)return;submittingRef.current=true;setSubmitting(true);try{if(current){const r=attempt.responses[current.id];if(r)await persist(r,attempt.current_section,current.id,attempt.attempt_id);}const result=await submitAttempt(attempt.attempt_id,reason,attempt.current_section,attempt.current_question);localStorage.removeItem(`cbt-forge-local-${attempt.attempt_id}`);router.push(`/result/${result.attempt_id}`);}catch(e){setError(e instanceof Error?e.message:"Submission failed.");submittingRef.current=false;setSubmitting(false);}}

//  if(loading)return<main className="min-h-screen bg-[#f7f8fb] p-5"><Loading label="Loading test"/></main>;
//  if(!attempt){const total=configuration?.sections.reduce((n,s)=>n+s.question_ids.length,0)||startQuestions.length;const duration=configuration?.test.timing.mode==="section"?configuration.sections.reduce((n,s)=>n+s.duration_minutes,0):configuration?.test.timing.total_minutes??0;return <main className="min-h-screen bg-[#f7f8fb] px-4 py-6"><div className="mx-auto max-w-4xl rounded-lg border border-line bg-white p-6 shadow-panel"><div className="text-sm font-semibold uppercase text-accent">CBT Forge</div><h1 className="mt-2 text-3xl font-semibold text-ink">{configuration?.test.title??"Test"}</h1>{error&&<div className="mt-4"><ErrorMessage message={error}/></div>}<div className="mt-6 grid gap-3 md:grid-cols-3"><div className="rounded border border-line p-3"><div className="text-xs uppercase text-steel">Questions</div><div className="font-semibold">{total}</div></div><div className="rounded border border-line p-3"><div className="text-xs uppercase text-steel">Duration</div><div className="font-semibold">{duration} Minutes</div></div><div className="rounded border border-line p-3"><div className="text-xs uppercase text-steel">Marking</div><div className="font-semibold">+{configuration?.test.global_marking.correct} / {configuration?.test.global_marking.wrong} / {configuration?.test.global_marking.unattempted}</div></div></div><div className="mt-5 whitespace-pre-wrap rounded border border-line bg-[#fafbfc] p-4 text-sm leading-6 text-steel">{configuration?.test.instructions}</div><label className="mt-5 flex items-center gap-2 text-sm"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/>I have read and understood the instructions.</label><button className="mt-5 rounded bg-forge px-5 py-3 text-sm font-semibold text-white disabled:opacity-50" disabled={!accepted||starting} onClick={start}>{starting?"Starting...":"START TEST"}</button></div></main>;}

//  const attempted=Object.values(attempt.responses).filter(answered).length;const marked=Object.values(attempt.responses).filter(r=>r.marked_for_review).length;
//  const answerInput=()=>{if(!current)return null;const r=attempt.responses[current.id];if(current.question_type==="integer")return <input type="number" step="1" inputMode="numeric" value={r?.numeric_value??""} onChange={e=>apply(current.id,e.target.value?[e.target.value]:[],r?.marked_for_review??false,attempt.current_section,{numeric_value:e.target.value,text_answer:null})} className="focus-ring mt-2 w-full max-w-md rounded border border-line px-4 py-3" placeholder="Enter an integer"/>;if(current.question_type==="real_number"||current.question_type==="numerical_tolerance")return <input type="number" step="any" inputMode="decimal" value={r?.numeric_value??""} onChange={e=>apply(current.id,e.target.value?[e.target.value]:[],r?.marked_for_review??false,attempt.current_section,{numeric_value:e.target.value,text_answer:null})} className="focus-ring mt-2 w-full max-w-md rounded border border-line px-4 py-3" placeholder="Enter a number"/>;if(current.question_type==="short_answer")return <input type="text" value={r?.text_answer??""} onChange={e=>apply(current.id,e.target.value?[e.target.value]:[],r?.marked_for_review??false,attempt.current_section,{numeric_value:null,text_answer:e.target.value})} className="focus-ring mt-2 w-full max-w-2xl rounded border border-line px-4 py-3" placeholder="Type your answer"/>;if(current.question_type==="long_answer")return <textarea rows={10} value={r?.text_answer??""} onChange={e=>apply(current.id,e.target.value?[e.target.value]:[],r?.marked_for_review??false,attempt.current_section,{numeric_value:null,text_answer:e.target.value})} className="focus-ring mt-2 w-full rounded border border-line px-4 py-3" placeholder="Write your answer here..."/>;return null;};

//  return <main className="min-h-screen bg-[#f7f8fb]"><header className="sticky top-0 z-20 border-b border-line bg-white px-4 py-3 shadow-sm"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3"><div><div className="text-sm font-semibold">{attempt.configuration.test.title}</div><div className="text-xs text-steel">{section?.name} | Question {sectionQs.findIndex(q=>q.id===current?.id)+1} of {sectionQs.length}</div></div><div className="rounded border border-line px-4 py-2 text-center font-semibold"><div className="text-xs uppercase">Time Remaining</div><div className="text-2xl tabular-nums">{time(remaining)}</div></div><button className="rounded border border-line px-3 py-2 text-sm font-semibold" onClick={()=>document.documentElement.requestFullscreen?.()}>Enter Fullscreen</button></div></header>
//  <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[1fr_330px]"><section className="space-y-4"><div className="flex flex-wrap gap-2 rounded-lg border border-line bg-white p-3 shadow-panel">{attempt.configuration.sections.map(s=><button key={s.id} className={`rounded border px-3 py-2 text-sm font-semibold ${s.id===attempt.current_section?"border-forge bg-[#eef7f8] text-forge":"border-line"}`} onClick={()=>switchSection(s)}>{s.name}</button>)}</div>{lost&&<ErrorMessage message="Connection lost. Local responses are preserved."/>}{error&&<ErrorMessage message={error}/>}
//  <article className="rounded-lg border border-line bg-white p-5 shadow-panel">{current?<><div className="mb-4 flex justify-between gap-3 border-b border-line pb-4"><div><h1 className="text-xl font-semibold">Question {current.question_number??current.id}</h1><div className="mt-1 text-sm text-steel">Status: {labels[status(response)]} {saving?"| Saving...":""}</div></div></div><p className="whitespace-pre-wrap text-base leading-7">{current.question_text}</p>{current.question_images.length>0&&<div className="mt-4 grid gap-3 md:grid-cols-2">{current.question_images.map(img=><img key={img.path} src={imageUrl(img.path)} className="max-h-96 w-full rounded border border-line object-contain" alt={img.alt_text??"Question visual"}/>)}</div>}
//  {choice(current)?<div className="mt-5 grid gap-3">{current.options.map(o=>{const selected=response?.selected_answers.includes(o.id)??false;return <label key={o.id} className={`flex cursor-pointer items-start gap-3 rounded border p-3 ${selected?"border-forge bg-[#eef7f8]":"border-line"}`}><input className="mt-1" name={current.id} type={multi(current)?"checkbox":"radio"} checked={selected} onChange={()=>choose(o.id)}/><span><b>{o.id}.</b> {o.text}</span></label>})}</div>:<div className="mt-5"><div className="text-sm font-semibold">{current.question_type==="long_answer"?"Enter your detailed answer":"Enter your answer"}</div>{answerInput()}</div>}
//  <div className="mt-6 flex flex-wrap gap-3 border-t border-line pt-4"><button className="rounded border border-line px-4 py-2 text-sm font-semibold disabled:opacity-40" disabled={!attempt.configuration.test.navigation.previous_question} onClick={()=>move(-1)}>Previous</button>{attempt.configuration.test.navigation.clear_response&&<button className="rounded border border-line px-4 py-2 text-sm font-semibold" onClick={()=>apply(current.id,[],response?.marked_for_review??false,attempt.current_section,{numeric_value:null,text_answer:null})}>Clear Response</button>}{attempt.configuration.test.navigation.mark_for_review&&<button className="rounded border border-line px-4 py-2 text-sm font-semibold" onClick={()=>apply(current.id,response?.selected_answers??[],!(response?.marked_for_review??false),attempt.current_section,{numeric_value:response?.numeric_value??null,text_answer:response?.text_answer??null})}>Mark for Review</button>}<button className="rounded bg-forge px-4 py-2 text-sm font-semibold text-white" onClick={()=>move(1)}>Save &amp; Next</button><button className="ml-auto rounded border border-red-200 px-4 py-2 text-sm font-semibold text-red-700" onClick={()=>setShowSubmit(true)}>SUBMIT TEST</button></div></>:<div>No questions found.</div>}</article></section>
//  <aside className="space-y-4"><div className="rounded-lg border border-line bg-white p-4 shadow-panel"><h2 className="text-sm font-semibold">Question Palette</h2><div className="mt-3 grid grid-cols-5 gap-2">{sectionQs.map((q,i)=><button key={q.id} className={`rounded border px-2 py-2 text-xs font-semibold ${statusClass(status(attempt.responses[q.id]))}`} onClick={()=>go(q.id,section?.id??null)}>{i+1}</button>)}</div></div><div className="rounded-lg border border-line bg-white p-4 shadow-panel"><h2 className="text-sm font-semibold">Section Progress</h2>{progress.map(x=><div key={x.section.id} className="mt-3"><div className="flex justify-between text-xs text-steel"><span>{x.section.name}</span><span>{x.answered}/{x.total}</span></div><div className="mt-1 h-2 rounded bg-slate-100"><div className="h-2 rounded bg-forge" style={{width:`${x.total?x.answered/x.total*100:0}%`}}/></div></div>)}</div></aside></div>
//  {showSubmit&&<div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"><div className="w-full max-w-md rounded-lg bg-white p-5 shadow-panel"><h2 className="text-lg font-semibold">You are about to submit.</h2><div className="mt-4 grid gap-2 text-sm text-steel"><div>Attempted: {attempted}</div><div>Unattempted: {attempt.questions.length-attempted}</div><div>Marked for Review: {marked}</div></div><div className="mt-5 flex justify-end gap-3"><button className="rounded border border-line px-4 py-2" onClick={()=>setShowSubmit(false)}>Cancel</button><button className="rounded bg-red-700 px-4 py-2 text-white disabled:opacity-50" disabled={submitting} onClick={()=>void submit("MANUAL")}>Submit Test</button></div></div></div>}</main>;
// }


"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createAttempt,
  getConfiguration,
  getQuestions,
  imageUrl,
  recordAttemptEvent,
  saveAttemptResponse,
  submitAttempt,
} from "@/lib/api";
import type {
  Attempt,
  AttemptResponse,
  Question,
  RuntimeStatus,
  TestConfiguration,
  TestSection,
} from "@/lib/types";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { Loading } from "@/components/common/Loading";

const labels: Record<RuntimeStatus, string> = {
  NOT_VISITED: "Not Visited",
  NOT_ANSWERED: "Not Answered",
  ANSWERED: "Answered",
  MARKED_FOR_REVIEW: "Marked",
  ANSWERED_AND_MARKED: "Answered + Marked",
};

function time(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(
    safe % 60
  ).padStart(2, "0")}`;
}

function status(response?: AttemptResponse): RuntimeStatus {
  return response?.status ?? "NOT_VISITED";
}

function statusClass(value: RuntimeStatus) {
  if (value === "ANSWERED") {
    return "border-green-300 bg-green-50 text-green-800";
  }

  if (value === "MARKED_FOR_REVIEW") {
    return "border-violet-300 bg-violet-50 text-violet-800";
  }

  if (value === "ANSWERED_AND_MARKED") {
    return "border-indigo-300 bg-indigo-50 text-indigo-800";
  }

  if (value === "NOT_ANSWERED") {
    return "border-amber-300 bg-amber-50 text-amber-800";
  }

  return "border-slate-300 bg-white text-slate-600";
}

function sectionQuestions(
  section: TestSection | undefined,
  questions: Question[]
) {
  const questionMap = new Map(questions.map((question) => [question.id, question]));

  return (section?.question_ids ?? [])
    .map((id) => questionMap.get(id))
    .filter(Boolean) as Question[];
}

function isChoiceQuestion(question: Question) {
  return [
    "single_choice",
    "multiple_choice",
    "multiple_select",
    "true_false",
    "image_based",
  ].includes(question.question_type);
}

function isMultipleChoice(question: Question) {
  return (
    question.question_type === "multiple_choice" ||
    question.question_type === "multiple_select"
  );
}

function effectiveMarking(
  configuration: TestConfiguration,
  question: Question,
  section?: TestSection
) {
  if (question.marking?.override_default) {
    return {
      correct: question.marking.correct,
      incorrect: question.marking.incorrect,
      unattempted: question.marking.unattempted,
      source: "Question",
    };
  }

  const marking = configuration.test.use_global_marking
    ? configuration.test.global_marking
    : section?.marking ?? configuration.test.global_marking;

  return {
    correct: marking.correct,
    incorrect: marking.wrong,
    unattempted: marking.unattempted,
    source: configuration.test.use_global_marking ? "Overall" : "Section",
  };
}

function isAnswered(response?: AttemptResponse) {
  if (!response) return false;

  return (
    response.selected_answers.length > 0 ||
    !!response.numeric_value?.trim() ||
    !!response.text_answer?.trim()
  );
}

export function TestClient({ testId }: { testId: string }) {
  const router = useRouter();

  const [configuration, setConfiguration] =
    useState<TestConfiguration | null>(null);

  const [startQuestions, setStartQuestions] = useState<Question[]>([]);
  const [attempt, setAttempt] = useState<Attempt | null>(null);

  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connectionLost, setConnectionLost] = useState(false);
  const [error, setError] = useState("");
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [remaining, setRemaining] = useState(0);

  const enteredQuestionAt = useRef(Date.now());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittingRef = useRef(false);

  /*
   * IMPORTANT:
   * No localStorage/sessionStorage/indexedDB is used here.
   *
   * The backend is the source of truth for:
   * - attempts
   * - responses
   * - test state
   * - results
   */

  useEffect(() => {
    async function load() {
      try {
        const [config, questions] = await Promise.all([
          getConfiguration(testId),
          getQuestions(testId),
        ]);

        setConfiguration(config);
        setStartQuestions(questions);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load test."
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [testId]);

  /*
   * Client-side display timer.
   *
   * The backend remains authoritative when the attempt is submitted.
   */
  useEffect(() => {
    if (!attempt || attempt.status !== "IN_PROGRESS") {
      return;
    }

    const started = Date.now();
    const initial = attempt.remaining_time_seconds;

    setRemaining(initial);

    const interval = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - started) / 1000);
      const currentRemaining = Math.max(0, initial - elapsed);

      setRemaining(currentRemaining);

      if (currentRemaining <= 0 && !submittingRef.current) {
        window.clearInterval(interval);
        void submit("TIMEOUT");
      }
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [attempt?.attempt_id, attempt?.remaining_time_seconds]);

  /*
   * Tab visibility events are sent directly to the backend.
   * Nothing is stored in the browser.
   */
  useEffect(() => {
    if (!attempt) return;

    const attemptId = attempt.attempt_id;

    const visibilityHandler = () => {
      void recordAttemptEvent(
        attemptId,
        document.hidden ? "TAB_HIDDEN" : "TAB_VISIBLE"
      );
    };

    document.addEventListener("visibilitychange", visibilityHandler);

    return () => {
      document.removeEventListener(
        "visibilitychange",
        visibilityHandler
      );
    };
  }, [attempt?.attempt_id]);

  const currentSection = useMemo(() => {
    return (
      attempt?.configuration.sections.find(
        (section) => section.id === attempt.current_section
      ) ?? attempt?.configuration.sections[0]
    );
  }, [attempt]);

  const questions = attempt?.questions ?? startQuestions;

  const currentSectionQuestions = sectionQuestions(
    currentSection,
    questions
  );

  const currentQuestion = useMemo(() => {
    return (
      questions.find(
        (question) => question.id === attempt?.current_question
      ) ??
      currentSectionQuestions[0] ??
      questions[0]
    );
  }, [
    questions,
    currentSectionQuestions,
    attempt?.current_question,
  ]);

  const currentResponse =
    currentQuestion && attempt
      ? attempt.responses[currentQuestion.id]
      : undefined;

  const sectionProgress = useMemo(() => {
    if (!attempt) return [];

    return attempt.configuration.sections.map((section) => {
      const ids = new Set(section.question_ids);

      const answeredCount = Object.values(attempt.responses).filter(
        (response) =>
          ids.has(response.question_id) && isAnswered(response)
      ).length;

      return {
        section,
        answered: answeredCount,
        total: section.question_ids.length,
      };
    });
  }, [attempt]);

  async function persistResponse(
    response: AttemptResponse,
    sectionId: string | null,
    questionId: string,
    attemptId: string
  ) {
    setSaving(true);

    try {
      await saveAttemptResponse(attemptId, questionId, {
        selected_answers: response.selected_answers,

        numeric_value: response.numeric_value ?? null,

        text_answer: response.text_answer ?? null,

        visited: response.visited,

        marked_for_review: response.marked_for_review,

        time_spent_seconds: response.time_spent_seconds,

        last_updated: response.last_updated,

        current_section: sectionId,

        current_question: questionId,
      });

      setConnectionLost(false);
    } catch {
      setConnectionLost(true);
    } finally {
      setSaving(false);
    }
  }

  function applyResponse(
    questionId: string,
    selectedAnswers: string[],
    marked =
      currentResponse?.marked_for_review ?? false,
    sectionId = attempt?.current_section ?? null,
    extra: {
      numeric_value?: string | null;
      text_answer?: string | null;
    } = {}
  ) {
    if (!attempt) return;

    const oldResponse = attempt.responses[questionId];

    const numericValue =
      extra.numeric_value !== undefined
        ? extra.numeric_value
        : oldResponse?.numeric_value ?? null;

    const textAnswer =
      extra.text_answer !== undefined
        ? extra.text_answer
        : oldResponse?.text_answer ?? null;

    const hasAnswer =
      selectedAnswers.length > 0 ||
      !!numericValue?.trim() ||
      !!textAnswer?.trim();

    const runtimeStatus: RuntimeStatus = marked
      ? hasAnswer
        ? "ANSWERED_AND_MARKED"
        : "MARKED_FOR_REVIEW"
      : hasAnswer
        ? "ANSWERED"
        : "NOT_ANSWERED";

    const response: AttemptResponse = {
      attempt_id: attempt.attempt_id,

      question_id: questionId,

      selected_answers: selectedAnswers,

      numeric_value: numericValue,

      text_answer: textAnswer,

      visited: true,

      marked_for_review: marked,

      status: runtimeStatus,

      time_spent_seconds: Math.max(
        Math.floor(
          (Date.now() - enteredQuestionAt.current) / 1000
        ),
        oldResponse?.time_spent_seconds ?? 0
      ),

      last_updated: new Date().toISOString(),
    };

    const nextAttempt: Attempt = {
      ...attempt,

      current_section: sectionId,

      current_question: questionId,

      responses: {
        ...attempt.responses,

        [questionId]: response,
      },
    };

    /*
     * Update React state immediately for responsive UI.
     * The actual persistent copy is the backend copy.
     */
    setAttempt(nextAttempt);

    /*
     * Debounce server save to avoid an API request on every
     * keystroke for text/numerical answers.
     */
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }

    saveTimer.current = setTimeout(() => {
      void persistResponse(
        response,
        sectionId,
        questionId,
        attempt.attempt_id
      );
    }, 450);
  }

  function chooseOption(optionId: string) {
    if (!currentQuestion) return;

    const selected =
      currentResponse?.selected_answers ?? [];

    if (isMultipleChoice(currentQuestion)) {
      const nextSelected = selected.includes(optionId)
        ? selected.filter((item) => item !== optionId)
        : [...selected, optionId];

      applyResponse(
        currentQuestion.id,
        nextSelected
      );
    } else {
      applyResponse(
        currentQuestion.id,
        [optionId]
      );
    }
  }

  function goTo(
    questionId: string,
    sectionId = attempt?.current_section ?? null
  ) {
    if (!attempt) return;

    /*
     * Make sure the currently displayed question gets its
     * latest state sent to the backend before navigating.
     */
    if (currentQuestion) {
      const current = attempt.responses[currentQuestion.id];

      if (current) {
        void persistResponse(
          current,
          attempt.current_section,
          currentQuestion.id,
          attempt.attempt_id
        );
      }
    }

    enteredQuestionAt.current = Date.now();

    const existing = attempt.responses[questionId];

    if (!existing) {
      applyResponse(
        questionId,
        [],
        false,
        sectionId
      );
      return;
    }

    const updatedExisting: AttemptResponse = {
      ...existing,

      visited: true,

      status:
        existing.status === "NOT_VISITED"
          ? "NOT_ANSWERED"
          : existing.status,
    };

    setAttempt({
      ...attempt,

      current_question: questionId,

      current_section: sectionId,

      responses: {
        ...attempt.responses,

        [questionId]: updatedExisting,
      },
    });
  }

  function move(delta: number) {
    if (!currentQuestion) return;

    const index = currentSectionQuestions.findIndex(
      (question) => question.id === currentQuestion.id
    );

    const nextQuestion =
      currentSectionQuestions[index + delta];

    if (nextQuestion) {
      goTo(
        nextQuestion.id,
        currentSection?.id ?? null
      );
    }
  }

  function switchSection(section: TestSection) {
    if (!attempt) return;

    if (
      !attempt.configuration.test.navigation
        .section_switching &&
      section.id !== attempt.current_section
    ) {
      setError("Section switching is disabled.");
      return;
    }

    const firstQuestion = sectionQuestions(
      section,
      attempt.questions
    )[0];

    if (firstQuestion) {
      goTo(firstQuestion.id, section.id);
    }
  }

  async function start() {
    setStarting(true);
    setError("");

    try {
      /*
       * resumeIfActive=true means the backend can resume an
       * existing active server-side attempt.
       *
       * No browser storage is involved.
       */
      const created = await createAttempt(
        testId,
        true
      );

      setAttempt(created);

      setRemaining(
        created.remaining_time_seconds
      );

      enteredQuestionAt.current = Date.now();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Test could not be started."
      );
    } finally {
      setStarting(false);
    }
  }

  async function submit(
    reason:
      | "MANUAL"
      | "TIMEOUT"
      | "SECTION_TIMEOUT" = "MANUAL"
  ) {
    if (!attempt || submittingRef.current) {
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);

    try {
      /*
       * Cancel any pending debounced save.
       */
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }

      /*
       * Persist the currently displayed response before
       * submitting the attempt.
       */
      if (currentQuestion) {
        const response =
          attempt.responses[currentQuestion.id];

        if (response) {
          await persistResponse(
            response,
            attempt.current_section,
            currentQuestion.id,
            attempt.attempt_id
          );
        }
      }

      const result = await submitAttempt(
        attempt.attempt_id,
        reason,
        attempt.current_section,
        attempt.current_question
      );

      /*
       * Result is now available from the backend.
       * No local browser cleanup is necessary because
       * nothing was stored locally.
       */
      router.push(
        `/result/${result.attempt_id}`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Submission failed."
      );

      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f8fb] p-5">
        <Loading label="Loading test" />
      </main>
    );
  }

  /*
   * TEST INSTRUCTIONS / START SCREEN
   */
  if (!attempt) {
    const totalQuestions =
      configuration?.sections.reduce(
        (total, section) =>
          total + section.question_ids.length,
        0
      ) || startQuestions.length;

    const duration =
      configuration?.test.timing.mode === "section"
        ? configuration.sections.reduce(
            (total, section) =>
              total + section.duration_minutes,
            0
          )
        : configuration?.test.timing
            .total_minutes ?? 0;

    return (
      <main className="min-h-screen bg-[#f7f8fb] px-4 py-6">
        <div className="mx-auto max-w-4xl rounded-lg border border-line bg-white p-6 shadow-panel">
          <div className="text-sm font-semibold uppercase text-accent">
            CBT Forge
          </div>

          <h1 className="mt-2 text-3xl font-semibold text-ink">
            {configuration?.test.title ?? "Test"}
          </h1>

          {error ? (
            <div className="mt-4">
              <ErrorMessage message={error} />
            </div>
          ) : null}

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded border border-line p-3">
              <div className="text-xs uppercase text-steel">
                Questions
              </div>

              <div className="font-semibold">
                {totalQuestions}
              </div>
            </div>

            <div className="rounded border border-line p-3">
              <div className="text-xs uppercase text-steel">
                Duration
              </div>

              <div className="font-semibold">
                {duration} Minutes
              </div>
            </div>

            <div className="rounded border border-line p-3">
              <div className="text-xs uppercase text-steel">
                Marking
              </div>

              <div className="font-semibold">
                {configuration?.test.use_global_marking
                  ? `Overall: +${configuration.test.global_marking.correct} / ${configuration.test.global_marking.wrong} / ${configuration.test.global_marking.unattempted}`
                  : "Section-wise marking"}
              </div>
            </div>
          </div>

          <div className="mt-5 rounded border border-line bg-[#fafbfc] p-4 text-sm leading-6 text-steel">
            <div>
              Sections:{" "}
              {configuration?.sections
                .map(
                  (section) =>
                    `${section.name} (${section.question_ids.length})`
                )
                .join(", ")}
            </div>

            <div>
              Section Switching:{" "}
              {configuration?.test.navigation
                .section_switching
                ? "Allowed"
                : "Disabled"}
            </div>

            <div>
              Mark for Review:{" "}
              {configuration?.test.navigation
                .mark_for_review
                ? "Enabled"
                : "Disabled"}
            </div>
          </div>

          <div className="mt-5 whitespace-pre-wrap rounded border border-line bg-[#fafbfc] p-4 text-sm leading-6 text-steel">
            {configuration?.test.instructions}
          </div>

          <label className="mt-5 flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) =>
                setAccepted(event.target.checked)
              }
            />

            I have read and understood the instructions.
          </label>

          <button
            className="mt-5 rounded bg-forge px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
            disabled={!accepted || starting}
            onClick={() => void start()}
          >
            {starting
              ? "Starting..."
              : "START TEST"}
          </button>
        </div>
      </main>
    );
  }

  const attempted = Object.values(
    attempt.responses
  ).filter(isAnswered).length;

  const marked = Object.values(
    attempt.responses
  ).filter(
    (response) => response.marked_for_review
  ).length;

  /*
   * Render answer input depending on question type.
   */
  function renderAnswerInput() {
    if (!currentQuestion) {
      return null;
    }
    if (!attempt) {
      return null;
}
    const response =
      attempt.responses[currentQuestion.id];

    if (
      currentQuestion.question_type ===
      "integer"
    ) {
      return (
        <input
          type="number"
          step="1"
          inputMode="numeric"
          value={response?.numeric_value ?? ""}
          onChange={(event) =>
            applyResponse(
              currentQuestion.id,
              event.target.value
                ? [event.target.value]
                : [],
              response?.marked_for_review ?? false,
              attempt.current_section,
              {
                numeric_value:
                  event.target.value,
                text_answer: null,
              }
            )
          }
          className="focus-ring mt-2 w-full max-w-md rounded border border-line px-4 py-3"
          placeholder="Enter an integer"
        />
      );
    }

    if (
      currentQuestion.question_type ===
        "real_number" ||
      currentQuestion.question_type ===
        "numerical_tolerance"
    ) {
      return (
        <input
          type="number"
          step="any"
          inputMode="decimal"
          value={response?.numeric_value ?? ""}
          onChange={(event) =>
            applyResponse(
              currentQuestion.id,
              event.target.value
                ? [event.target.value]
                : [],
              response?.marked_for_review ?? false,
              attempt.current_section,
              {
                numeric_value:
                  event.target.value,
                text_answer: null,
              }
            )
          }
          className="focus-ring mt-2 w-full max-w-md rounded border border-line px-4 py-3"
          placeholder="Enter a number"
        />
      );
    }

    if (
      currentQuestion.question_type ===
      "short_answer"
    ) {
      return (
        <input
          type="text"
          value={response?.text_answer ?? ""}
          onChange={(event) =>
            applyResponse(
              currentQuestion.id,
              event.target.value
                ? [event.target.value]
                : [],
              response?.marked_for_review ?? false,
              attempt.current_section,
              {
                numeric_value: null,
                text_answer:
                  event.target.value,
              }
            )
          }
          className="focus-ring mt-2 w-full max-w-2xl rounded border border-line px-4 py-3"
          placeholder="Type your answer"
        />
      );
    }

    if (
      currentQuestion.question_type ===
      "long_answer"
    ) {
      return (
        <textarea
          rows={10}
          value={response?.text_answer ?? ""}
          onChange={(event) =>
            applyResponse(
              currentQuestion.id,
              event.target.value
                ? [event.target.value]
                : [],
              response?.marked_for_review ?? false,
              attempt.current_section,
              {
                numeric_value: null,
                text_answer:
                  event.target.value,
              }
            )
          }
          className="focus-ring mt-2 w-full rounded border border-line px-4 py-3"
          placeholder="Write your answer here..."
        />
      );
    }

    return null;
  }

  const timerClass =
    remaining <= 60
      ? "border-red-300 bg-red-50 text-red-700"
      : remaining <= 300
        ? "border-amber-300 bg-amber-50 text-amber-800"
        : "border-line bg-white text-ink";

  const resolvedMarking = currentQuestion
    ? effectiveMarking(
        attempt.configuration,
        currentQuestion,
        currentSection
      )
    : null;

  return (
    <main className="min-h-screen bg-[#f7f8fb]">
      <header className="sticky top-0 z-20 border-b border-line bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-ink">
              {attempt.configuration.test.title}
            </div>

            <div className="text-xs text-steel">
              {currentSection?.name} | Question{" "}
              {currentSectionQuestions.findIndex(
                (question) =>
                  question.id === currentQuestion?.id
              ) + 1}{" "}
              of {currentSectionQuestions.length}
            </div>
          </div>

          <div
            className={`rounded border px-4 py-2 text-center font-semibold ${timerClass}`}
          >
            <div className="text-xs uppercase">
              Time Remaining
            </div>

            <div className="text-2xl tabular-nums">
              {time(remaining)}
            </div>
          </div>

          <button
            className="rounded border border-line px-3 py-2 text-sm font-semibold"
            onClick={() =>
              document.documentElement.requestFullscreen?.()
            }
          >
            Enter Fullscreen
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[1fr_330px]">
        <section className="space-y-4">
          <div className="flex flex-wrap gap-2 rounded-lg border border-line bg-white p-3 shadow-panel">
            {attempt.configuration.sections.map(
              (sectionItem) => (
                <button
                  key={sectionItem.id}
                  className={`rounded border px-3 py-2 text-sm font-semibold ${
                    sectionItem.id ===
                    attempt.current_section
                      ? "border-forge bg-[#eef7f8] text-forge"
                      : "border-line"
                  }`}
                  onClick={() =>
                    switchSection(sectionItem)
                  }
                >
                  {sectionItem.name}
                </button>
              )
            )}

            {!attempt.configuration.test.navigation
              .section_switching ? (
              <span className="px-2 py-2 text-sm text-amber-700">
                Section switching is disabled.
              </span>
            ) : null}
          </div>

          {connectionLost ? (
            <ErrorMessage
              message="Connection to the server was lost. Your current answer is still displayed, but it has not been confirmed as saved by the server."
            />
          ) : null}

          {error ? (
            <ErrorMessage message={error} />
          ) : null}

          <article className="rounded-lg border border-line bg-white p-5 shadow-panel">
            {currentQuestion ? (
              <>
                <div className="mb-4 flex flex-wrap justify-between gap-3 border-b border-line pb-4">
                  <div>
                    <h1 className="text-xl font-semibold text-ink">
                      Question{" "}
                      {currentQuestion.question_number ??
                        currentQuestion.id}
                    </h1>

                    <div className="mt-1 text-sm text-steel">
                      Status:{" "}
                      {
                        labels[
                          status(currentResponse)
                        ]
                      }{" "}
                      {saving ? "| Saving..." : ""}
                    </div>
                    {resolvedMarking ? (
                      <div className="mt-2 text-xs font-semibold text-steel">
                        {currentQuestion.question_type.replaceAll("_", " ")} | {resolvedMarking.source} marks: +{resolvedMarking.correct} / {resolvedMarking.incorrect} / {resolvedMarking.unattempted}
                      </div>
                    ) : null}
                  </div>

                  <div className="text-sm text-steel">
                    Section progress:{" "}
                    {sectionProgress.find(
                      (item) =>
                        item.section.id ===
                        currentSection?.id
                    )?.answered ?? 0}{" "}
                    /{" "}
                    {currentSectionQuestions.length}{" "}
                    answered
                  </div>
                </div>

                <p className="whitespace-pre-wrap text-base leading-7 text-ink">
                  {currentQuestion.question_text}
                </p>

                {currentQuestion.question_images
                  .length > 0 ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {currentQuestion.question_images.map(
                      (image) => (
                        <a
                          key={image.path}
                          href={imageUrl(image.path)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <img
                            loading="lazy"
                            src={imageUrl(image.path)}
                            className="max-h-96 w-full rounded border border-line object-contain"
                            alt={
                              image.alt_text ??
                              "Question visual"
                            }
                          />
                        </a>
                      )
                    )}
                  </div>
                ) : null}

                {isChoiceQuestion(
                  currentQuestion
                ) ? (
                  <div className="mt-5 grid gap-3">
                    {currentQuestion.options.map(
                      (option) => {
                        const selected =
                          currentResponse?.selected_answers.includes(
                            option.id
                          ) ?? false;

                        return (
                          <label
                            key={option.id}
                            className={`flex cursor-pointer items-start gap-3 rounded border p-3 ${
                              selected
                                ? "border-forge bg-[#eef7f8]"
                                : "border-line"
                            }`}
                          >
                            <input
                              className="mt-1"
                              name={currentQuestion.id}
                              type={
                                isMultipleChoice(
                                  currentQuestion
                                )
                                  ? "checkbox"
                                  : "radio"
                              }
                              checked={selected}
                              onChange={() =>
                                chooseOption(
                                  option.id
                                )
                              }
                            />

                            <span className="flex-1">
                              <span className="font-semibold">
                                {option.id}.
                              </span>{" "}
                              {option.text}

                              {option.images?.length ? (
                                <span className="mt-2 grid grid-cols-2 gap-2">
                                  {option.images.map(
                                    (image) => (
                                      <img
                                        key={
                                          image.path
                                        }
                                        src={imageUrl(
                                          image.path
                                        )}
                                        className="max-h-40 w-full object-contain"
                                        alt={`Option ${option.id}`}
                                      />
                                    )
                                  )}
                                </span>
                              ) : null}
                            </span>
                          </label>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <div className="mt-5">
                    <div className="text-sm font-semibold text-ink">
                      {currentQuestion.question_type ===
                      "long_answer"
                        ? "Enter your detailed answer"
                        : "Enter your answer"}
                    </div>

                    {renderAnswerInput()}
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-3 border-t border-line pt-4">
                  <button
                    className="rounded border border-line px-4 py-2 text-sm font-semibold disabled:opacity-40"
                    disabled={
                      !attempt.configuration.test
                        .navigation.previous_question
                    }
                    onClick={() => move(-1)}
                  >
                    Previous
                  </button>

                  {attempt.configuration.test.navigation
                    .clear_response ? (
                    <button
                      className="rounded border border-line px-4 py-2 text-sm font-semibold"
                      onClick={() =>
                        applyResponse(
                          currentQuestion.id,
                          [],
                          currentResponse?.marked_for_review ??
                            false,
                          attempt.current_section,
                          {
                            numeric_value: null,
                            text_answer: null,
                          }
                        )
                      }
                    >
                      Clear Response
                    </button>
                  ) : null}

                  {attempt.configuration.test.navigation
                    .mark_for_review ? (
                    <button
                      className="rounded border border-line px-4 py-2 text-sm font-semibold"
                      onClick={() =>
                        applyResponse(
                          currentQuestion.id,
                          currentResponse?.selected_answers ??
                            [],
                          !(
                            currentResponse?.marked_for_review ??
                            false
                          ),
                          attempt.current_section,
                          {
                            numeric_value:
                              currentResponse?.numeric_value ??
                              null,
                            text_answer:
                              currentResponse?.text_answer ??
                              null,
                          }
                        )
                      }
                    >
                      {currentResponse?.marked_for_review
                        ? "Unmark Review"
                        : "Mark for Review"}
                    </button>
                  ) : null}

                  <button
                    className="rounded bg-forge px-4 py-2 text-sm font-semibold text-white"
                    onClick={() => move(1)}
                  >
                    Save &amp; Next
                  </button>

                  <button
                    className="ml-auto rounded border border-red-200 px-4 py-2 text-sm font-semibold text-red-700"
                    onClick={() =>
                      setShowSubmit(true)
                    }
                  >
                    SUBMIT TEST
                  </button>
                </div>
              </>
            ) : (
              <div className="text-sm text-steel">
                No questions found.
              </div>
            )}
          </article>
        </section>

        <aside className="space-y-4">
          <div className="rounded-lg border border-line bg-white p-4 shadow-panel">
            <h2 className="text-sm font-semibold">
              Question Palette
            </h2>

            <div className="mt-3 grid grid-cols-5 gap-2">
              {currentSectionQuestions.map(
                (question, index) => {
                  const questionStatus = status(
                    attempt.responses[question.id]
                  );

                  return (
                    <button
                      key={question.id}
                      className={`rounded border px-2 py-2 text-xs font-semibold ${statusClass(
                        questionStatus
                      )}`}
                      onClick={() =>
                        goTo(
                          question.id,
                          currentSection?.id ?? null
                        )
                      }
                      aria-label={`Question ${
                        index + 1
                      } ${
                        labels[questionStatus]
                      }`}
                    >
                      {index + 1}
                    </button>
                  );
                }
              )}
            </div>

            <div className="mt-4 grid gap-2 text-xs">
              {Object.entries(labels).map(
                ([key, label]) => (
                  <div
                    key={key}
                    className={`rounded border px-2 py-1 ${statusClass(
                      key as RuntimeStatus
                    )}`}
                  >
                    {label}
                  </div>
                )
              )}
            </div>
          </div>

          <div className="rounded-lg border border-line bg-white p-4 shadow-panel">
            <h2 className="text-sm font-semibold">
              Section Progress
            </h2>

            {sectionProgress.map(
              ({ section: progressSection, answered, total }) => (
                <div
                  key={progressSection.id}
                  className="mt-3"
                >
                  <div className="flex justify-between text-xs text-steel">
                    <span>
                      {progressSection.name}
                    </span>

                    <span>
                      {answered}/{total}
                    </span>
                  </div>

                  <div className="mt-1 h-2 rounded bg-slate-100">
                    <div
                      className="h-2 rounded bg-forge"
                      style={{
                        width: `${
                          total
                            ? (answered / total) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )
            )}
          </div>
        </aside>
      </div>

      {showSubmit ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-panel">
            <h2 className="text-lg font-semibold">
              You are about to submit.
            </h2>

            <div className="mt-4 grid gap-2 text-sm text-steel">
              <div>
                Attempted: {attempted}
              </div>

              <div>
                Unattempted:{" "}
                {attempt.questions.length -
                  attempted}
              </div>

              <div>
                Marked for Review: {marked}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                className="rounded border border-line px-4 py-2"
                onClick={() =>
                  setShowSubmit(false)
                }
              >
                Cancel
              </button>

              <button
                className="rounded bg-red-700 px-4 py-2 text-white disabled:opacity-50"
                disabled={submitting}
                onClick={() =>
                  void submit("MANUAL")
                }
              >
                {submitting
                  ? "Submitting..."
                  : "Submit Test"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
