"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function OnboardingForm() {
  const params = useSearchParams();
  const router = useRouter();
  const track = params.get("track") === "pn" ? "PN" : "RN";
  const [timing, setTiming] = useState("");
  const [confidence, setConfidence] = useState("");
  const [dailyGoal, setDailyGoal] = useState(20);
  const [examDate, setExamDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function continueFlow() {
    if (!timing || !confidence) return;
    setLoading(true); setMessage("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/auth?track=${track.toLowerCase()}`);
      return;
    }
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      exam_track: track.toLowerCase(),
      exam_date: examDate || null,
      test_timing: timing,
      confidence_level: confidence,
      daily_goal: dailyGoal,
      onboarding_complete: true,
    });
    if (error) { setMessage(error.message); setLoading(false); return; }
    router.push(`/dashboard?track=${track.toLowerCase()}`);
  }

  const isRN = track === "RN";
  return <main className="min-h-screen bg-slate-50 px-6 py-10"><div className="mx-auto max-w-2xl"><a href="/" className="text-xl font-extrabold text-[var(--navy)]">NursePrep<span className="text-[var(--teal)]">IQ</span></a><div className="mt-8 rounded-3xl bg-white p-7 shadow-sm ring-1 ring-slate-200 md:p-10">
    <div className={`inline-flex rounded-full px-4 py-2 text-sm font-black ${isRN?"bg-blue-50 text-[var(--blue)]":"bg-cyan-50 text-[var(--teal)]"}`}>NCLEX-{track}® PREP</div>
    <p className="mt-6 text-sm font-bold text-[var(--teal)]">PERSONALIZE YOUR PLAN</p>
    <h1 className="mt-2 text-3xl font-black text-[var(--navy)]">Set your NCLEX-{track} study goals.</h1>
    <p className="mt-3 text-slate-600">Everything in this path will be organized for {isRN?"registered nurse":"practical/vocational nurse"} preparation.</p>
    <div className={`mt-7 rounded-2xl border p-5 ${isRN?"border-blue-100 bg-blue-50/60":"border-cyan-100 bg-cyan-50/60"}`}><div className="flex items-center justify-between"><div><p className="text-xs font-black tracking-wider text-slate-500">SELECTED TRACK</p><p className="mt-1 text-xl font-black text-[var(--navy)]">NCLEX-{track}®</p></div><span className="text-sm font-bold text-slate-500">Locked for setup ✓</span></div><a href="/#paths" className="mt-3 inline-block text-sm font-bold text-[var(--teal)]">Choose a different track</a></div>
    <label className="mt-7 block font-bold">When do you plan to take the NCLEX-{track}?</label><select value={timing} onChange={e=>setTiming(e.target.value)} className="mt-3 w-full rounded-xl border border-slate-300 bg-white p-3.5"><option value="">Choose one</option><option value="within_30_days">Within 30 days</option><option value="1_2_months">1–2 months</option><option value="3_6_months">3–6 months</option><option value="not_scheduled">Not scheduled yet</option></select>
    <label className="mt-7 block font-bold">NCLEX-{track} exam date <span className="font-normal text-slate-400">(optional)</span></label><input type="date" value={examDate} onChange={e=>setExamDate(e.target.value)} className="mt-3 w-full rounded-xl border border-slate-300 bg-white p-3.5"/>
    <label className="mt-7 block font-bold">Daily NCLEX-{track} question goal</label><div className="mt-3 grid grid-cols-4 gap-2">{[10,20,30,50].map(n=><button type="button" key={n} onClick={()=>setDailyGoal(n)} className={`rounded-xl border py-3 font-bold ${dailyGoal===n?"border-[var(--blue)] bg-blue-50 text-[var(--blue)]":"border-slate-200"}`}>{n}</button>)}</div>
    <label className="mt-7 block font-bold">How confident do you feel about the NCLEX-{track} right now?</label><select value={confidence} onChange={e=>setConfidence(e.target.value)} className="mt-3 w-full rounded-xl border border-slate-300 bg-white p-3.5"><option value="">Choose one</option><option value="not_confident">Not confident yet</option><option value="somewhat_confident">Somewhat confident</option><option value="confident">Confident</option></select>
    {message && <p className="mt-5 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{message}</p>}<button type="button" onClick={continueFlow} disabled={!timing||!confidence||loading} className="mt-8 w-full rounded-xl bg-[var(--navy)] py-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{loading?"Saving your plan…":`Build My ${track} Dashboard →`}</button>
  </div></div></main>;
}

export default function OnboardingPage(){ return <Suspense fallback={<main className="min-h-screen bg-slate-50"/>}><OnboardingForm/></Suspense>; }
