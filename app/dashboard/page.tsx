'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Profile = {
  display_name: string | null;
  email: string | null;
  exam_track: 'rn' | 'pn' | null;
  exam_date: string | null;
  test_timing: string | null;
  confidence_level: string | null;
  daily_goal: number | null;
  onboarding_complete: boolean | null;
};

type Attempt = { is_correct: boolean | null; created_at: string };

export default function Dashboard(){
 const router=useRouter();
 const [profile,setProfile]=useState<Profile|null>(null);
 const [attempts,setAttempts]=useState<Attempt[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');

 useEffect(()=>{
  let active=true;
  async function loadDashboard(){
   const supabase=createClient();
   const {data:{user},error:userError}=await supabase.auth.getUser();
   if(!active)return;
   if(userError||!user){router.replace('/auth?track=rn');return;}

   const [{data:profileData,error:profileError},{data:attemptData,error:attemptError}]=await Promise.all([
    supabase.from('profiles').select('display_name,email,exam_track,exam_date,test_timing,confidence_level,daily_goal,onboarding_complete').eq('id',user.id).maybeSingle(),
    supabase.from('question_attempts').select('is_correct,created_at').eq('user_id',user.id).order('created_at',{ascending:false}),
   ]);
   if(!active)return;
   if(profileError){setError(profileError.message);setLoading(false);return;}
   if(!profileData?.onboarding_complete){
    const t=profileData?.exam_track==='pn'?'pn':'rn';
    router.replace(`/onboarding?track=${t}`);
    return;
   }
   if(attemptError)setError(attemptError.message);
   setProfile(profileData as Profile);
   setAttempts((attemptData||[]) as Attempt[]);
   setLoading(false);
  }
  loadDashboard();
  return()=>{active=false};
 },[router]);

 const track=(profile?.exam_track==='pn'?'PN':'RN');
 const name=profile?.display_name?.trim()||profile?.email?.split('@')[0]||'Student';
 const total=attempts.length;
 const correct=attempts.filter(a=>a.is_correct===true).length;
 const accuracy=total?Math.round((correct/total)*100):null;
 const todayKey=new Date().toLocaleDateString('en-CA');
 const todayCount=attempts.filter(a=>new Date(a.created_at).toLocaleDateString('en-CA')===todayKey).length;
 const dailyGoal=profile?.daily_goal||20;
 const streak=useMemo(()=>{
  const days=new Set(attempts.map(a=>new Date(a.created_at).toLocaleDateString('en-CA')));
  let count=0; const d=new Date();
  while(days.has(d.toLocaleDateString('en-CA'))){count++;d.setDate(d.getDate()-1);}
  return count;
 },[attempts]);
 const cards=[
  ['Readiness',total>=10?(accuracy!==null?`${accuracy}% baseline`:'Building'):'Building',total>=10?'Your current baseline reflects completed practice.':'Complete at least 10 questions to establish a baseline.'],
  ['Questions',String(total),`${todayCount} of ${dailyGoal} questions completed today.`],
  ['Accuracy',accuracy===null?'—':`${accuracy}%`,accuracy===null?'Accuracy begins after your first practice session.':`${correct} correct out of ${total} attempted.`],
  ['Study streak',`${streak} day${streak===1?'':'s'}`,'Small, consistent sessions beat cramming.'],
 ];

 if(loading)return <main className="grid min-h-screen place-items-center bg-slate-50"><p className="font-bold text-slate-500">Loading your NursePrepIQ dashboard…</p></main>;

 return <main className="min-h-screen bg-slate-50"><header className="bg-[var(--deep-navy)] text-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8"><a href="/" className="text-xl font-black">NursePrep<span className="text-[var(--aqua)]">IQ</span></a><div className="flex items-center gap-4 text-sm font-bold"><span>NCLEX-{track} Prep</span><button onClick={async()=>{await createClient().auth.signOut(); location.href='/';}} className="rounded-lg border border-white/20 px-3 py-2">Sign out</button></div></div></header><section className="dashboard-hero"><div className="mx-auto max-w-7xl px-6 py-12 lg:px-8"><p className="font-bold text-cyan-200">YOUR NCLEX-{track} PREP DASHBOARD</p><h1 className="mt-2 text-4xl font-black text-white">Welcome, {name}.</h1><p className="mt-3 max-w-2xl text-slate-200">Your job today is simple: learn one thing well, practice it, and understand every mistake.</p>{profile?.exam_date&&<p className="mt-3 text-sm font-semibold text-cyan-100">Target exam date: {new Date(`${profile.exam_date}T00:00:00`).toLocaleDateString()}</p>}</div></section><div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">{error&&<div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">Some progress data could not be loaded: {error}</div>}<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([a,b,c])=><div key={a} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><p className="text-sm font-bold text-slate-500">{a}</p><p className="mt-2 text-2xl font-black text-[var(--deep-navy)]">{b}</p><p className="mt-2 text-sm leading-5 text-slate-500">{c}</p></div>)}</div><div className="mt-7 grid gap-6 lg:grid-cols-[1.3fr_.7fr]"><div className="rounded-[2rem] bg-white p-7 shadow-sm ring-1 ring-slate-200"><div className="flex items-center justify-between"><div><p className="text-sm font-black text-[var(--teal)]">TODAY’S PLAN</p><h2 className="mt-1 text-2xl font-black text-[var(--deep-navy)]">Build your clinical reasoning</h2></div><span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-[var(--teal)]">GOAL {dailyGoal} Q</span></div><div className="mt-6 space-y-3">{['Learn: Heart Failure Made Simple',`Practice: ${Math.min(10,dailyGoal)} priority questions`,'Clinical Judgment: Recognize Cues'].map((x,i)=><div key={x} className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--deep-navy)] font-black text-[var(--aqua)]">{i+1}</span><span className="font-bold">{x}</span></div>)}</div><button className="mt-5 w-full rounded-xl bg-[var(--blue)] py-3.5 font-extrabold text-white">Start Today’s Session →</button></div><div className="rounded-[2rem] bg-[var(--deep-navy)] p-7 text-white shadow-lg"><p className="text-sm font-black text-[var(--aqua)]">{total>=10?'YOUR BASELINE':'FIRST MILESTONE'}</p><h2 className="mt-2 text-2xl font-black">{total>=10?'Keep strengthening your baseline.':'Establish your baseline.'}</h2><p className="mt-3 leading-7 text-slate-200">{total>=10?`You have completed ${total} questions with ${accuracy}% accuracy.`:'A short diagnostic will help NursePrepIQ identify where to focus first.'}</p><button className="mt-6 w-full rounded-xl bg-[var(--aqua)] py-3 font-extrabold text-[var(--deep-navy)]">{total>=10?'Continue Practice →':'Take Diagnostic →'}</button></div></div></div></main>;
}
