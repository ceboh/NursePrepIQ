'use client'

import {Suspense,useEffect,useMemo,useRef,useState} from 'react'
import {useRouter,useSearchParams} from 'next/navigation'
import {createClient} from '@/lib/supabase/client'
import QuestionRenderer from '@/components/questions/QuestionRenderer'
import CaseStudyPanel from '@/components/questions/CaseStudyPanel'
import {QUESTION_COLUMNS,ITEM_TYPE_LABEL,describeKey,displayResponse,isComplete,optionLetter,scoreQuestion,type BankQuestion,type CaseStudy,type ChoiceResponse,type ResponseConfig,type StudentResponse} from '@/lib/questions/bank'

const feedback=[['clear','Clear'],['unsure_between_two','I was unsure between two'],['rationale_helpful','Rationale helped'],['confusing','Question was confusing'],['multiple_answers_possible','More than one answer seems correct'],['disagree_with_key','I disagree with the key'],['needs_more_detail','Needs more explanation'],['possibly_inaccurate','May be inaccurate/outdated']]

// Standalone items in bank order; each case's items stay together and in sequence.
function orderQuestions(rows:BankQuestion[]){
  const sortKey=(q:BankQuestion)=>[q.track,String(q.set_number).padStart(3,'0'),q.case_id?'1':'0',String(q.case_sequence??0).padStart(2,'0'),q.source_id].join('|')
  return [...rows].sort((a,b)=>sortKey(a).localeCompare(sortKey(b)))
}

// What the AI teacher sees: options carry the letters the student actually saw.
function lessonPayload(q:BankQuestion,display:ResponseConfig,response:StudentResponse,caseStudy:CaseStudy|null){
  const choice=q.item_type==='single_best_answer'||q.item_type==='multiple_response'
  const options=choice?(display as ChoiceResponse).options.map((o,n)=>({key:optionLetter(n),text:o.text,is_correct:o.correct})):[]
  const selected=choice?(display as ChoiceResponse).options.map((o,n)=>response.selected?.includes(o.id)?optionLetter(n):null).filter(Boolean):null
  return {stem:q.stem,item_type:q.item_type,topic:q.topic,system:q.system,discipline:q.discipline,client_need:q.client_need,clinical_judgment_step:q.clinical_judgment_step,case_study:caseStudy,options,selected,correct:choice?options.filter(o=>o.is_correct).map(o=>o.key):describeKey(q),answer_key:describeKey(q),response_config:choice?undefined:display,student_response:response,rationale:q.rationale}
}

function LibraryPractice(){const router=useRouter(),sp=useSearchParams(),start=useRef(Date.now())
const [seed]=useState(()=>Math.random().toString(36).slice(2))
const [qs,setQs]=useState<BankQuestion[]>([]),[cases,setCases]=useState<Record<string,CaseStudy>>({}),[voice,setVoice]=useState('coral'),[speed,setSpeed]=useState(1),[audioUrl,setAudioUrl]=useState(''),[audioLoading,setAudioLoading]=useState(false),[i,setI]=useState(0),[response,setResponse]=useState<StudentResponse>({}),[submitted,setSubmitted]=useState(false),[attemptId,setAttemptId]=useState<string|null>(null),[loading,setLoading]=useState(true),[err,setErr]=useState(''),[chat,setChat]=useState(''),[reply,setReply]=useState(''),[asking,setAsking]=useState(false),[lesson,setLesson]=useState<any>(null),[lessonLoading,setLessonLoading]=useState(false)
const q=qs[i],system=sp.get('system'),discipline=sp.get('discipline')
const display=useMemo(()=>q?displayResponse(q,seed):null,[q,seed])
const caseStudy=q?.case_id?cases[q.case_id]??null:null
const caseTotal=q?.case_id?qs.filter(x=>x.case_id===q.case_id).length:0

useEffect(()=>{try{const v=localStorage.getItem('npiq_voice'),p=Number(localStorage.getItem('npiq_speed'))
if(v)setVoice(v)
if([0.75,1,1.25,1.5,2].includes(p))setSpeed(p)}catch{}
(async()=>{const s=createClient()
const {data:{user}}=await s.auth.getUser()
if(!user){router.replace('/auth')
return}const {data:p}=await s.from('profiles').select('exam_track').eq('id',user.id).maybeSingle()
const t=p?.exam_track==='pn'?'pn':'rn'
let query=s.from('questions').select(QUESTION_COLUMNS).eq('track',t)
if(system)query=query.eq('system',system)
if(discipline)query=query.eq('discipline',discipline)
const {data,error}=await query.limit(1000)
if(error)setErr(error.message)
const rows=orderQuestions((data||[]) as BankQuestion[])
setQs(rows)
const caseIds=[...new Set(rows.map(r=>r.case_id).filter(Boolean))] as string[]
if(caseIds.length){const {data:cs}=await s.from('case_studies').select('id,title,scenario,exhibits').in('id',caseIds)
setCases(Object.fromEntries((cs||[]).map((c:any)=>[c.id,c])))}
setLoading(false)})()},[router,system,discipline])

async function submit(){if(!q)return
const s=createClient(),{data:{user}}=await s.auth.getUser()
if(!user)return
const scored=scoreQuestion(q,response)
const {data,error}=await s.from('question_attempts').insert({user_id:user.id,question_id:q.id,source_id:q.source_id,selected_answer:{...response,score:scored},is_correct:scored.isCorrect,response_time_ms:Date.now()-start.current,client_need:q.client_need,clinical_judgment_step:q.clinical_judgment_step,subject:q.system}).select('id').single()
if(error){setErr(error.message)
return}setAttemptId(data?.id||null)
setSubmitted(true)
void loadLesson()}
async function sendFeedback(code:string){if(!q)return
const s=createClient(),{data:{user}}=await s.auth.getUser()
if(!user)return
await s.from('question_feedback').insert({user_id:user.id,question_id:q.id,source_id:q.source_id,attempt_id:attemptId,feedback_code:code})}
async function ask(){if(!q||!display||!chat.trim())return
setAsking(true)
setReply('')
const s=createClient(),{data:{session}}=await s.auth.getSession()
const res=await fetch('/api/question-tutor',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+(session?.access_token||'')},body:JSON.stringify({message:chat,question:lessonPayload(q,display,response,caseStudy)})})
const j=await res.json()
setReply(j.answer||j.error||'Unable to answer right now.')
if(session?.user&&j.answer)await s.from('question_ai_chat').insert({user_id:session.user.id,question_id:q.id,source_id:q.source_id,attempt_id:attemptId,user_message:chat,assistant_message:j.answer})
setAsking(false)}
async function fetchLesson(){if(!q||!display)return null
const s=createClient(),{data:{session}}=await s.auth.getSession()
const res=await fetch('/api/teaching-rationale',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+(session?.access_token||'')},body:JSON.stringify({question:lessonPayload(q,display,response,caseStudy)})})
const j=await res.json()
return res.ok&&j.lesson?j.lesson:{error:j.error||'The teaching lesson could not be generated. Please try again.'}}
async function loadLesson(){setLessonLoading(true)
setLesson(await fetchLesson())
setLessonLoading(false)}
async function playAudio(text:string){const s=createClient(),{data:{session}}=await s.auth.getSession()
const res=await fetch('/api/explanation-audio',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+(session?.access_token||'')},body:JSON.stringify({text,voice})})
if(!res.ok)return false
const u=URL.createObjectURL(await res.blob())
setAudioUrl(u)
setTimeout(()=>{const a=document.getElementById('rationale-audio') as HTMLAudioElement|null
if(a){a.playbackRate=speed
a.play()}},50)
return true}
async function listen(){if(!q)return
setAudioLoading(true)
if(audioUrl)URL.revokeObjectURL(audioUrl)
let activeLesson=lesson?.what_is_happening?lesson:null
if(!activeLesson){try{if(await playAudio(q.rationale+' The answer: '+describeKey(q)+'.')){setAudioLoading(false)
return}}catch{}
try{activeLesson=await fetchLesson()
if(activeLesson?.what_is_happening)setLesson(activeLesson)}catch{}}
if(!activeLesson?.what_is_happening){setAudioLoading(false)
return}
const parts=[activeLesson.what_is_happening,'Let us read the clues.',...(activeLesson.decode_the_stem||[]).map((x:any)=>x.cue+'. '+x.meaning),'What is this question really asking? '+activeLesson.what_is_being_asked,'Here is how to reason through it.',...(activeLesson.reasoning_steps||[]),'Why the answer is correct. '+activeLesson.correct_answer,'Now let us examine the alternatives individually.',...(activeLesson.options||[]).map((x:any)=>x.key+'. '+x.why+(x.when_it_would_fit&&x.when_it_would_fit!=='Not in this situation'?(' A situation where this choice would fit is: '+x.when_it_would_fit):'')),'A useful way to remember this: '+activeLesson.memory_hook,'The lesson to carry to the next question is: '+activeLesson.nclex_takeaway].filter(Boolean)
try{await playAudio(parts.join(' '))}catch{}
setAudioLoading(false)}
function moveTo(delta:number){if(audioUrl)URL.revokeObjectURL(audioUrl)
setAudioUrl('')
setI(x=>Math.max(0,Math.min(qs.length-1,x+delta)))
setResponse({})
setSubmitted(false)
setAttemptId(null)
setChat('')
setReply('')
setLesson(null)
setLessonLoading(false)
setErr('')
start.current=Date.now()}
if(loading)return <main className="grid min-h-screen place-items-center"><b>Loading practice…</b></main>
if(!q||!display)return <main className="grid min-h-screen place-items-center p-6"><div className="text-center"><h1 className="text-2xl font-black">No questions available in this collection yet.</h1>{err&&<p className="mt-3 text-rose-700">{err}</p>}<button onClick={()=>router.push('/dashboard')} className="mt-5 rounded-xl bg-[var(--deep-navy)] px-5 py-3 font-bold text-white">Back to dashboard</button></div></main>
const scored=submitted?scoreQuestion(q,response):null

return <main className="min-h-screen bg-[var(--background)] px-5 py-8"><div className="mx-auto max-w-3xl"><button onClick={()=>router.push('/dashboard')} className="mb-5 font-bold text-[var(--teal)]">← Dashboard</button><div className="mb-4 flex justify-between"><b>{system||discipline||'All questions'}</b><span>Question {i+1} of {qs.length}</span></div><section className="rounded-3xl bg-white p-7 shadow-sm ring-1 ring-slate-200"><div className="flex flex-wrap gap-2 text-xs font-black"><span className="rounded-full bg-cyan-50 px-3 py-1">{q.system}</span><span className="rounded-full bg-blue-50 px-3 py-1">{q.discipline}</span><span className="rounded-full bg-slate-100 px-3 py-1">{ITEM_TYPE_LABEL[q.item_type]}</span>{q.status==='pilot'&&<span className="rounded-full bg-amber-50 px-3 py-1 text-amber-800" title="Pilot items are still being reviewed">Pilot</span>}</div>{caseStudy&&<CaseStudyPanel key={caseStudy.id} caseStudy={caseStudy} step={q.case_sequence||1} total={caseTotal} judgmentStep={q.clinical_judgment_step}/>}<h1 className="mt-5 text-xl font-black leading-8">{q.stem}</h1><QuestionRenderer question={q} display={display} value={response} submitted={submitted} onChange={setResponse}/>{err&&<p className="mt-4 rounded-xl bg-rose-50 p-3 text-rose-800">{err}</p>}{!submitted&&<button disabled={!isComplete(q,response)} onClick={submit} className="mt-6 w-full rounded-xl bg-[var(--blue)] py-4 font-black text-white disabled:opacity-40">Submit Answer →</button>}{scored&&<p className={`mt-6 rounded-xl p-4 font-black ${scored.isCorrect?'bg-emerald-50 text-emerald-800':'bg-rose-50 text-rose-800'}`}>{scored.isCorrect?'Correct':'Not quite'} · {scored.earned} of {scored.possible} point{scored.possible===1?'':'s'}</p>}</section>
{submitted&&<section className="mt-5 rounded-3xl bg-white p-7 shadow-sm ring-1 ring-slate-200"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-black">Teaching Rationale</h2><div className="flex flex-wrap items-end gap-2"><label className="text-xs font-bold">Voice<select value={voice} onChange={e=>{setVoice(e.target.value)
try{localStorage.setItem('npiq_voice',e.target.value)}catch{}}} className="ml-2 rounded-lg border p-2 font-normal"><option value="coral">Coral</option><option value="nova">Nova</option><option value="sage">Sage</option><option value="alloy">Alloy</option><option value="onyx">Onyx</option><option value="shimmer">Shimmer</option></select></label><label className="text-xs font-bold">Pacing<select value={speed} onChange={e=>{const n=Number(e.target.value)
setSpeed(n)
try{localStorage.setItem('npiq_speed',String(n))}catch{}
const a=document.getElementById('rationale-audio') as HTMLAudioElement|null
if(a)a.playbackRate=n}} className="ml-2 rounded-lg border p-2 font-normal">{[0.75,1,1.25,1.5,2].map(n=><option key={n} value={n}>{n}×</option>)}</select></label><button onClick={listen} disabled={audioLoading} className="rounded-xl bg-[var(--deep-navy)] px-4 py-2 font-black text-white disabled:opacity-50">{audioLoading?'Preparing…':'🔊 Listen'}</button></div></div>{audioUrl&&<audio id="rationale-audio" src={audioUrl} controls onLoadedMetadata={e=>{e.currentTarget.playbackRate=speed}} className="mt-3 w-full"/>}<p className="mt-2 text-xs text-slate-500">Choose a teacher voice and pacing, then listen to the full explanation.</p><div className="mt-4 rounded-2xl bg-emerald-50 p-5"><h3 className="font-black">✅ Answer</h3><p className="mt-2 leading-7 text-slate-700">{describeKey(q)}</p><h3 className="mt-4 font-black">Rationale</h3><p className="mt-2 leading-7 text-slate-700">{q.rationale}</p></div>{lessonLoading&&<p className="mt-3 text-sm font-bold text-[var(--teal)]">Building your step-by-step lesson…</p>}{lesson?.error&&<p className="mt-3 text-sm text-slate-500">{lesson.error}</p>}{lesson?.what_is_happening&&<><div className="mt-4 rounded-2xl bg-cyan-50 p-5"><h3 className="font-black">🧠 What is happening?</h3><p className="mt-2 leading-7 text-slate-700">{lesson.what_is_happening}</p></div><div className="mt-4 rounded-2xl border p-5"><h3 className="font-black">🔎 Decode the clues</h3><div className="mt-3 space-y-2">{(lesson.decode_the_stem||[]).map((x:any,n:number)=><p key={n}><b>{x.cue}</b> → {x.meaning}</p>)}</div></div><div className="mt-4 rounded-2xl border p-5"><h3 className="font-black">❓ What is the question really asking?</h3><p className="mt-2 leading-7">{lesson.what_is_being_asked}</p></div><div className="mt-4 rounded-2xl border p-5"><h3 className="font-black">🪜 Think through it step by step</h3><ol className="mt-3 list-decimal space-y-2 pl-6">{(lesson.reasoning_steps||[]).map((x:string,n:number)=><li key={n}>{x.replace(/^\s*\d+[.)]\s*/,'')}</li>)}</ol></div><div className="mt-4 rounded-2xl bg-emerald-50 p-5"><h3 className="font-black">✅ Why the answer wins</h3><p className="mt-2 leading-7">{lesson.correct_answer}</p></div>{(lesson.options||[]).some((x:any)=>x.verdict!=='correct')&&<div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-black">Why the other choices do not fit</h3><ul className="mt-2 space-y-2 leading-7 text-slate-700">{lesson.options.filter((x:any)=>x.verdict!=='correct').map((x:any,n:number)=><li key={n}><b>{x.key}:</b> {x.why}{x.when_it_would_fit&&x.when_it_would_fit!=='Not in this situation'?' When it would fit: '+x.when_it_would_fit:''}</li>)}</ul></div>}<div className="mt-5 rounded-2xl bg-slate-50 p-5"><h3 className="font-black">💡 Memory hook</h3><p className="mt-2 leading-7 text-slate-600">{lesson.memory_hook}</p><h3 className="mt-4 font-black">🎯 NCLEX takeaway</h3><p className="mt-2 leading-7 text-slate-600">{lesson.nclex_takeaway}</p></div></>}<div className="mt-7 border-t pt-6"><h3 className="font-black">Help us improve this question</h3><p className="mt-1 text-sm text-slate-500">Optional — choose any feedback that fits.</p><div className="mt-3 flex flex-wrap gap-2">{feedback.map(([code,label])=><button key={code} onClick={e=>{sendFeedback(code)
;(e.currentTarget as HTMLButtonElement).disabled=true}} className="rounded-full border border-slate-200 px-3 py-2 text-sm font-bold disabled:bg-cyan-50 disabled:text-[var(--teal)]">{label}</button>)}</div></div><div className="mt-7 rounded-2xl bg-slate-50 p-5"><h3 className="font-black">✨ Ask NursePrepIQ AI</h3><p className="mt-1 text-sm text-slate-500">Ask why a response is right or wrong, or ask for a simpler explanation.</p><textarea value={chat} onChange={e=>setChat(e.target.value)} placeholder="Example: Why isn't the second choice the best answer?" className="mt-3 min-h-24 w-full rounded-xl border border-slate-300 bg-white p-3"/><button onClick={ask} disabled={asking||!chat.trim()} className="mt-2 rounded-xl bg-[var(--deep-navy)] px-5 py-3 font-black text-white disabled:opacity-40">{asking?'Thinking…':'Ask AI'}</button>{reply&&<div className="mt-4 rounded-xl bg-white p-4 leading-7 shadow-sm"><b>NursePrepIQ AI</b><p className="mt-1 whitespace-pre-wrap">{reply}</p></div>}</div><div className="mt-6 grid grid-cols-2 gap-3"><button onClick={()=>moveTo(-1)} disabled={i===0} className="rounded-xl border-2 border-[var(--blue)] bg-white py-3 font-black text-[var(--blue)] disabled:opacity-40">← Previous Question</button><button onClick={()=>moveTo(1)} disabled={i>=qs.length-1} className="rounded-xl bg-[var(--blue)] py-3 font-black text-white disabled:opacity-40">{i>=qs.length-1?'Collection complete':'Next Question →'}</button></div></section>}</div></main>}
export default function LibraryPracticePage(){return <Suspense fallback={<main className="grid min-h-screen place-items-center"><b>Loading practice…</b></main>}><LibraryPractice/></Suspense>}
