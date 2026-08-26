// "use client";

// import { useRef, useState } from "react";
// import { imageUrl, uploadImage } from "@/lib/api";
// import type { Explanation, Option, Question, QuestionImage, QuestionType } from "@/lib/types";

// const questionTypes: QuestionType[] = ["single_choice", "multiple_choice", "true_false", "image_based", "unknown"];
// const difficulties = ["easy", "medium", "hard", "unknown"] as const;

// export function QuestionEditor({ question, testId, onChange }: { question: Question; testId: string; onChange: (question: Question) => void }) {
//   const [error, setError] = useState("");
//   const patch = (update: Partial<Question>) => onChange({ ...question, ...update });
//   const updateOption = (index: number, option: Option) => patch({ options: question.options.map((item, itemIndex) => itemIndex === index ? option : item) });
//   const explanation = question.explanation ?? { text: null, images: [] };
//   return <div className="space-y-4">
//     {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
//     <div className="grid gap-3 md:grid-cols-4">
//       <Field label="Number"><input className="focus-ring w-full rounded-md border border-line px-3 py-2 text-sm" type="number" value={question.question_number ?? ""} onChange={(e) => patch({ question_number: e.target.value ? Number(e.target.value) : null })} /></Field>
//       <Field label="Type"><select className="focus-ring w-full rounded-md border border-line px-3 py-2 text-sm" value={question.question_type} onChange={(e) => patch({ question_type: e.target.value as QuestionType })}>{questionTypes.map((type) => <option key={type}>{type}</option>)}</select></Field>
//       <Field label="Difficulty"><select className="focus-ring w-full rounded-md border border-line px-3 py-2 text-sm" value={question.difficulty} onChange={(e) => patch({ difficulty: e.target.value as Question["difficulty"] })}>{difficulties.map((item) => <option key={item}>{item}</option>)}</select></Field>
//       <Field label="Source page"><input className="focus-ring w-full rounded-md border border-line px-3 py-2 text-sm" type="number" value={question.source_page ?? ""} onChange={(e) => patch({ source_page: e.target.value ? Number(e.target.value) : null })} /></Field>
//     </div>
//     <Field label="Question text"><textarea className="focus-ring min-h-28 w-full rounded-md border border-line px-3 py-2 text-sm" value={question.question_text} onChange={(e) => patch({ question_text: e.target.value })} /></Field>
//     <ImageAssets title="Question Images" assets={question.question_images} testId={testId} questionId={question.id} scope="question" onError={setError} onChange={(question_images) => patch({ question_images })} />
//     <div className="space-y-3"><div className="text-xs font-semibold uppercase text-steel">Options</div>{question.options.map((option, index) => <div key={`${option.id}-${index}`} className="rounded-md border border-line p-3"><div className="grid gap-2 md:grid-cols-[70px_1fr_auto]"><input className="focus-ring rounded-md border border-line px-2 py-2 text-sm" value={option.id} onChange={(e) => updateOption(index, { ...option, id: e.target.value.toUpperCase() })} /><input className="focus-ring rounded-md border border-line px-3 py-2 text-sm" value={option.text} placeholder="Option text (optional)" onChange={(e) => updateOption(index, { ...option, text: e.target.value })} /><button className="rounded-md border border-line px-3 py-2 text-sm text-steel" onClick={() => patch({ options: question.options.filter((_, i) => i !== index) })} disabled={question.options.length <= 1}>Delete</button></div><ImageAssets title={`Option ${option.id} Images`} assets={option.images ?? []} testId={testId} questionId={question.id} scope="options" optionId={option.id} compact onError={setError} onChange={(images) => updateOption(index, { ...option, images })} /></div>)}<button className="rounded-md border border-line px-3 py-2 text-sm font-medium text-forge" onClick={() => patch({ options: [...question.options, { id: String.fromCharCode(65 + question.options.length), text: "", images: [] }] })}>Add option</button></div>
//     <div className="grid gap-3 md:grid-cols-3"><Field label="Correct answer"><input className="focus-ring w-full rounded-md border border-line px-3 py-2 text-sm" value={question.correct_answer?.join(",") ?? ""} onChange={(e) => patch({ correct_answer: e.target.value.split(",").map((item) => item.trim().toUpperCase()).filter(Boolean) || null })} /></Field><Field label="Section"><input className="focus-ring w-full rounded-md border border-line px-3 py-2 text-sm" value={question.section ?? ""} onChange={(e) => patch({ section: e.target.value || null })} /></Field><Field label="Topic"><input className="focus-ring w-full rounded-md border border-line px-3 py-2 text-sm" value={question.topic ?? ""} onChange={(e) => patch({ topic: e.target.value || null })} /></Field></div>
//     <Field label="Explanation text"><textarea className="focus-ring min-h-20 w-full rounded-md border border-line px-3 py-2 text-sm" value={explanation.text ?? ""} onChange={(e) => patch({ explanation: { ...explanation, text: e.target.value || null } })} /></Field>
//     <ImageAssets title="Explanation Images" assets={explanation.images} testId={testId} questionId={question.id} scope="explanation" onError={setError} onChange={(images) => patch({ explanation: { ...explanation, images } })} />
//   </div>;
// }

// function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1 block text-xs font-semibold uppercase text-steel">{label}</span>{children}</label>; }

// function ImageAssets({ title, assets, testId, questionId, scope, optionId, onChange, onError, compact = false }: { title: string; assets: QuestionImage[]; testId: string; questionId: string; scope: "question" | "explanation" | "options"; optionId?: string; onChange: (assets: QuestionImage[]) => void; onError: (value: string) => void; compact?: boolean }) {
//   const input = useRef<HTMLInputElement>(null); const [dragIndex, setDragIndex] = useState<number | null>(null); const [replaceIndex, setReplaceIndex] = useState<number | null>(null);
//   const add = async (files: FileList | null) => { const file = files?.[0]; if (!file) return; try { const asset = await uploadImage({ file, testId, questionId, scope, optionId }); const next = replaceIndex === null ? [...assets, asset] : assets.map((item, index) => index === replaceIndex ? asset : item); onChange(next); onError(""); } catch (err) { onError(err instanceof Error ? err.message : "Image upload failed."); } finally { setReplaceIndex(null); if (input.current) input.current.value = ""; } };
//   return <section className={`mt-3 rounded-md border border-dashed border-line p-3 ${compact ? "" : "bg-[#fafbfc]"}`} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void add(e.dataTransfer.files); }}><div className="flex flex-wrap items-center justify-between gap-2"><div className="text-xs font-semibold uppercase text-steel">{title}</div><button type="button" className="rounded-md border border-line px-2 py-1 text-xs font-semibold text-forge" onClick={() => { setReplaceIndex(null); input.current?.click(); }}>Upload Image</button><input ref={input} className="hidden" type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" onChange={(e) => void add(e.target.files)} /></div>{assets.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{assets.map((asset, index) => <div key={asset.id ?? asset.path} draggable onDragStart={() => setDragIndex(index)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragIndex === null || dragIndex === index) return; const next = [...assets]; const [moved] = next.splice(dragIndex, 1); next.splice(index, 0, moved); onChange(next); setDragIndex(null); }} className="rounded border border-line bg-white p-2"><img className="h-24 w-full object-contain" src={imageUrl(asset.path)} alt={asset.alt_text ?? asset.filename ?? "Uploaded image"} /><div className="mt-1 truncate text-xs text-steel">{asset.filename ?? asset.path}</div><div className="text-xs text-steel">{asset.width && asset.height ? `${asset.width} x ${asset.height}` : "Dimensions unavailable"}</div><div className="mt-2 flex gap-2"><button type="button" className="text-xs text-forge" onClick={() => { setReplaceIndex(index); input.current?.click(); }}>Replace</button><button type="button" className="text-xs text-red-700" onClick={() => onChange(assets.filter((_, i) => i !== index))}>Delete</button></div></div>)}</div> : <div className="mt-2 text-xs text-steel">Drop PNG, JPG, or WEBP files here. Images are optional.</div>}</section>;
// }

"use client";

import { useRef, useState } from "react";
import { imageUrl, uploadImage } from "@/lib/api";
import type {
  AnswerInputMode,
  EvaluationMode,
  Explanation,
  Option,
  Question,
  QuestionImage,
  QuestionType,
} from "@/lib/types";

const questionTypes: QuestionType[] = [
  "single_choice","multiple_choice","multiple_select","true_false",
  "integer","real_number","numerical_tolerance","short_answer",
  "long_answer","image_based","unknown",
];
const difficulties = ["easy","medium","hard","unknown"] as const;
const inputModes: AnswerInputMode[] = [
  "single_choice","multiple_select","integer","real_number","text","long_text",
];

const choiceTypes = new Set<QuestionType>([
  "single_choice","multiple_choice","multiple_select","true_false","image_based",
]);

function defaultInputMode(type: QuestionType): AnswerInputMode | null {
  if (type === "single_choice" || type === "true_false" || type === "image_based") return "single_choice";
  if (type === "multiple_choice" || type === "multiple_select") return "multiple_select";
  if (type === "integer") return "integer";
  if (type === "real_number" || type === "numerical_tolerance") return "real_number";
  if (type === "short_answer") return "text";
  if (type === "long_answer") return "long_text";
  return null;
}

function splitAnswers(value: string, uppercase: boolean) {
  return value.split(",").map(v => v.trim()).filter(Boolean).map(v => uppercase ? v.toUpperCase() : v);
}

export function QuestionEditor({
  question, testId, onChange,
}: {
  question: Question;
  testId: string;
  onChange: (question: Question) => void;
}) {
  const [error, setError] = useState("");
  const patch = (u: Partial<Question>) => onChange({ ...question, ...u });
  const patchAnswer = (u: Partial<Question["answer_config"]>) =>
    patch({ answer_config: { ...question.answer_config, ...u } });
  const updateOption = (i: number, option: Option) =>
    patch({ options: question.options.map((x, n) => n === i ? option : x) });
  const explanation: Explanation = question.explanation ?? { text: null, images: [] };

  function changeType(type: QuestionType) {
    patch({
      question_type: type,
      answer_config: {
        ...question.answer_config,
        input_mode: defaultInputMode(type),
        evaluation: type === "long_answer" ? "manual" : question.answer_config.evaluation,
      },
    });
  }

  const correct = question.answer_config.correct_answers;
  const aliases = question.answer_config.accepted_answers;

  return (
    <div className="space-y-5">
      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-3 md:grid-cols-4">
        <Field label="Number"><input className={input} type="number" value={question.question_number ?? ""} onChange={e => patch({ question_number: e.target.value ? Number(e.target.value) : null })}/></Field>
        <Field label="Type"><select className={input} value={question.question_type} onChange={e => changeType(e.target.value as QuestionType)}>{questionTypes.map(x => <option key={x} value={x}>{x}</option>)}</select></Field>
        <Field label="Difficulty"><select className={input} value={question.difficulty} onChange={e => patch({ difficulty: e.target.value as Question["difficulty"] })}>{difficulties.map(x => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Source page"><input className={input} type="number" value={question.source_page ?? ""} onChange={e => patch({ source_page: e.target.value ? Number(e.target.value) : null })}/></Field>
      </div>

      <Field label="Question text"><textarea className={`${input} min-h-28`} value={question.question_text} onChange={e => patch({ question_text: e.target.value })}/></Field>

      <ImageAssets title="Question Images" assets={question.question_images} testId={testId} questionId={question.id} scope="question" onError={setError} onChange={question_images => patch({ question_images })}/>

      {choiceTypes.has(question.question_type) && (
        <section className="space-y-3">
          <div className="text-xs font-semibold uppercase text-steel">Options</div>
          {question.options.map((option, index) => (
            <div key={`${option.id}-${index}`} className="rounded-md border border-line p-3">
              <div className="grid gap-2 md:grid-cols-[70px_1fr_auto]">
                <input className={input} value={option.id} onChange={e => updateOption(index,{...option,id:e.target.value.toUpperCase()})}/>
                <input className={input} value={option.text} placeholder="Option text" onChange={e => updateOption(index,{...option,text:e.target.value})}/>
                <button type="button" className={button} disabled={question.options.length <= 1} onClick={() => patch({ options: question.options.filter((_,i)=>i!==index) })}>Delete</button>
              </div>
              <ImageAssets title={`Option ${option.id} Images`} assets={option.images ?? []} testId={testId} questionId={question.id} scope="options" optionId={option.id} compact onError={setError} onChange={images => updateOption(index,{...option,images})}/>
            </div>
          ))}
          <button type="button" className={button} onClick={() => patch({ options:[...question.options,{id:String.fromCharCode(65+question.options.length),text:"",images:[]}] })}>Add option</button>
        </section>
      )}

      <section className="rounded-lg border border-line bg-[#fafbfc] p-4">
        <h3 className="text-sm font-semibold text-ink">Answer Configuration</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Field label="Input mode">
            <select className={input} value={question.answer_config.input_mode ?? defaultInputMode(question.question_type) ?? ""} onChange={e => patchAnswer({ input_mode: e.target.value ? e.target.value as AnswerInputMode : null })}>
              <option value="">Not specified</option>{inputModes.map(x=><option key={x}>{x}</option>)}
            </select>
          </Field>
          <Field label="Evaluation">
            <select className={input} value={question.answer_config.evaluation} onChange={e=>patchAnswer({evaluation:e.target.value as EvaluationMode})}>
              <option value="automatic">automatic</option><option value="manual">manual</option>
            </select>
          </Field>
        </div>

        <div className="mt-3">
          <Field label="Correct answer(s)">
            <input className={input} value={correct.join(", ")} placeholder={choiceTypes.has(question.question_type) ? "A, C" : "10 or expected answer"}
              onChange={e => {
                const values = splitAnswers(e.target.value, choiceTypes.has(question.question_type));
                patch({ correct_answer: values.length ? values : null, answer_config:{...question.answer_config,correct_answers:values} });
              }}/>
          </Field>
        </div>

        {(question.question_type === "short_answer" || question.question_type === "long_answer") && (
          <>
            <div className="mt-3"><Field label="Accepted answers / aliases"><input className={input} value={aliases.join(", ")} placeholder="New Delhi, Delhi NCR" onChange={e=>patchAnswer({accepted_answers:splitAnswers(e.target.value,false)})}/></Field></div>
            <label className="mt-3 flex items-center gap-2 text-sm text-ink"><input type="checkbox" checked={question.answer_config.case_sensitive} onChange={e=>patchAnswer({case_sensitive:e.target.checked})}/> Case-sensitive</label>
          </>
        )}

        {question.question_type === "numerical_tolerance" && (
          <div className="mt-3 max-w-sm"><Field label="Tolerance"><input className={input} value={question.answer_config.tolerance ?? ""} placeholder="0.01" onChange={e=>patchAnswer({tolerance:e.target.value || null})}/></Field></div>
        )}

        {["integer", "real_number", "numerical_tolerance"].includes(question.question_type) && (
          <div className="mt-3 grid gap-3 md:grid-cols-2"><Field label="Numerical answer"><input className={input} value={question.numerical_answer?.value ?? correct[0] ?? ""} placeholder={question.question_type === "integer" ? "42" : "10.5"} onChange={e=>{const value=e.target.value;patch({ numerical_answer:{ ...(question.numerical_answer ?? {}), value, tolerance: question.question_type === "numerical_tolerance" ? question.answer_config.tolerance ?? "0" : "0" }, correct_answer:value?[value]:null, answer_config:{...question.answer_config,correct_answers:value?[value]:[]} }); }}/></Field><Field label="Tolerance"><input className={input} disabled={question.question_type !== "numerical_tolerance"} value={question.answer_config.tolerance ?? question.numerical_answer?.tolerance ?? "0"} onChange={e=>patch({ numerical_answer:{ ...(question.numerical_answer ?? {}), value:question.numerical_answer?.value ?? correct[0] ?? null, tolerance:e.target.value || "0" }, answer_config:{...question.answer_config,tolerance:e.target.value || null} })}/></Field></div>
        )}

        {question.question_type === "long_answer" && <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">Long answers are normally evaluated manually.</div>}
      </section>

      <section className="rounded-lg border border-line bg-[#fafbfc] p-4">
        <h3 className="text-sm font-semibold text-ink">Question Marking</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <Field label="Correct"><input className={input} value={question.marking.correct} onChange={e=>patch({marking:{...question.marking,correct:e.target.value}})}/></Field>
          <Field label="Incorrect"><input className={input} value={question.marking.incorrect} onChange={e=>patch({marking:{...question.marking,incorrect:e.target.value}})}/></Field>
          <Field label="Unattempted"><input className={input} value={question.marking.unattempted} onChange={e=>patch({marking:{...question.marking,unattempted:e.target.value}})}/></Field>
          <Field label="Maximum marks"><input className={input} value={question.marking.maximum_marks ?? ""} onChange={e=>patch({marking:{...question.marking,maximum_marks:e.target.value || null}})}/></Field>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm text-ink"><input type="checkbox" checked={question.marking.override_default} onChange={e=>patch({marking:{...question.marking,override_default:e.target.checked}})}/> Override test/section marking</label>
        <p className="mt-2 text-xs text-steel">Values such as -0.33 and -1/3 remain exact strings.</p>
      </section>

      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Section"><input className={input} value={question.section ?? ""} onChange={e=>patch({section:e.target.value || null})}/></Field>
        <Field label="Topic"><input className={input} value={question.topic ?? ""} onChange={e=>patch({topic:e.target.value || null})}/></Field>
        <Field label="Subtopic"><input className={input} value={question.subtopic ?? ""} onChange={e=>patch({subtopic:e.target.value || null})}/></Field>
      </div>

      <Field label="Explanation text"><textarea className={`${input} min-h-20`} value={explanation.text ?? ""} onChange={e=>patch({explanation:{...explanation,text:e.target.value || null}})}/></Field>
      <ImageAssets title="Explanation Images" assets={explanation.images} testId={testId} questionId={question.id} scope="explanation" onError={setError} onChange={images=>patch({explanation:{...explanation,images}})}/>
    </div>
  );
}

const input = "focus-ring w-full rounded-md border border-line px-3 py-2 text-sm";
const button = "rounded-md border border-line px-3 py-2 text-sm font-medium text-forge disabled:opacity-40";

function Field({label,children}:{label:string;children:React.ReactNode}) {
  return <label className="block"><span className="mb-1 block text-xs font-semibold uppercase text-steel">{label}</span>{children}</label>;
}

function ImageAssets({title,assets,testId,questionId,scope,optionId,onChange,onError,compact=false}:{title:string;assets:QuestionImage[];testId:string;questionId:string;scope:"question"|"explanation"|"options";optionId?:string;onChange:(assets:QuestionImage[])=>void;onError:(value:string)=>void;compact?:boolean}) {
  const inputRef=useRef<HTMLInputElement>(null);
  const [replaceIndex,setReplaceIndex]=useState<number|null>(null);
  const [dragIndex,setDragIndex]=useState<number|null>(null);

  async function add(files:FileList|null) {
    const file=files?.[0]; if(!file)return;
    try {
      const asset=await uploadImage({file,testId,questionId,scope,optionId});
      onChange(replaceIndex===null?[...assets,asset]:assets.map((x,i)=>i===replaceIndex?asset:x));
      onError("");
    } catch(e) { onError(e instanceof Error?e.message:"Image upload failed."); }
    finally { setReplaceIndex(null); if(inputRef.current)inputRef.current.value=""; }
  }

  return <section className={`mt-3 rounded-md border border-dashed border-line p-3 ${compact?"":"bg-[#fafbfc]"}`} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();void add(e.dataTransfer.files);}}>
    <div className="flex items-center justify-between gap-2"><div className="text-xs font-semibold uppercase text-steel">{title}</div><button type="button" className={button} onClick={()=>{setReplaceIndex(null);inputRef.current?.click();}}>Upload Image</button><input ref={inputRef} className="hidden" type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" onChange={e=>void add(e.target.files)}/></div>
    {assets.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{assets.map((asset,index)=><div key={asset.id??asset.path} draggable onDragStart={()=>setDragIndex(index)} onDragOver={e=>e.preventDefault()} onDrop={()=>{if(dragIndex===null||dragIndex===index)return;const n=[...assets];const[m]=n.splice(dragIndex,1);n.splice(index,0,m);onChange(n);setDragIndex(null);}} className="rounded border border-line bg-white p-2">
      <img className="h-24 w-full object-contain" src={imageUrl(asset.path)} alt={asset.alt_text??asset.filename??"Uploaded image"}/>
      <div className="mt-1 truncate text-xs text-steel">{asset.filename??asset.path}</div>
      <div className="mt-2 flex gap-3"><button type="button" className="text-xs text-forge" onClick={()=>{setReplaceIndex(index);inputRef.current?.click();}}>Replace</button><button type="button" className="text-xs text-red-700" onClick={()=>onChange(assets.filter((_,i)=>i!==index))}>Delete</button></div>
    </div>)}</div>:<div className="mt-2 text-xs text-steel">Drop PNG, JPG, or WEBP files here.</div>}
  </section>;
}
