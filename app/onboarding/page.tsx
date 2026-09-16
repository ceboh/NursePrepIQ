"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function OnboardingForm() {
  const params = useSearchParams();
  const router = useRouter();
  const initial = params.get("track") === "pn" ? "PN" : "RN";
  const goalsStep = params.get("step") === "goals";
  const [track, setTrack] = useState(initial);
  const [timing, setTiming] = useState("");
  const [confidence, setConfidence] = useState("");
  const [dailyGoal, setDailyGoal] = useState(20);
  const [examDate, setExamDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { setTrack(initial); }, [initial]);

  async function continueFlow() {
    if (!timing || !confidence) return;
    if (!goalsStep) {
      router.push(`/auth?track=${track.toLowerCase()}`);
      return;
    }
    setLoading(true); setMessage("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push(`/auth?track=${track.toLowerCase()}`); return; }
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
    router.push("/dashboard");
  }

  return <main className="min-h-screen bg-slate-50 px-6 py-10"><div className="mx-auto max-w-2xl"><a href="/" className="text-xl font-extrabold text-[var(--navy)]">NursePrep<span className="text-[var(--teal)]">IQ</span></a><div className="mt-8 rounded-3xl bg-white p-7 shadow-sm ring-1 ring-slate-200 md:p-10"><p className="text-sm font-bold text-[var(--teal)]">{goalsStep ? "PERSONALIZE YOUR PLAN" : "YOUR STUDY PATH"}</p><h1 className="mt-2 text-3xl font-black text-[var(--navy)]">{goalsStep ? "Set your NCLEX study goals." : "Tell us what you’re preparing for."}</h1><p className="mt-3 text-slate-600">We’ll use this to personalize your dashboard and future practice.</p>
  <label className="mt-8 block font-bold">Exam track</label><div className="mt-3 grid grid-cols-2 gap-3">{["RN","PN"].map(x=><button type="button" key={x} onClick={()=>setTrack(x)} className={`rounded-xl border p-4 font-extrabold ${track===x?"border-[var(--teal)] bg-[var(--soft-aqua)] text-[var(--teal)]":"border-slate-200"}`}>{x} Prep</button>)}</div>
  <label className="mt-7 block font-bold">When do you plan to test?</label><select value={timing} onChange={e=>setTiming(e.target.value)} className="mt-3 w-full rounded-xl border border-slate-300 bg-white p-3.5"><option value="">Choose one</option><option value="within_30_days">Within 30 days</option><option value="1_2_months">1–2 months</option><option value="3_6_months">3–6 months</option><option value="not_scheduled">Not scheduled yet</option></select>
  {goalsStep && <><label className="mt-7 block font-bold">Exam date <span className="font-normal text-slate-400">(optional)</span></label><input type="date" value={examDate} onChange={e=>setExamDate(e.target.value)} className="mt-3 w-full rounded-xl border border-slate-300 bg-white p-3.5"/><label className="mt-7 block font-bold">Daily question goal</label><div className="mt-3 grid grid-cols-4 gap-2">{[10,20,30,50].map(n=><button type="button" key={n} onClick={()=>setDailyGoal(n)} className={`rounded-xl border py-3 font-bold ${dailyGoal===n?"border-[var(--blue)] bg-blue-50 text-[var(--blue)]":"border-slate-200"}`}>{n}</button>)}</div></>}
  <label className="mt-7 block font-bold">How confident do you feel right now?</label><select value={confidence} onChange={e=>setConfidence(e.target.value)} className="mt-3 w-full rounded-xl border border-slate-300 bg-white p-3.5"><option value="">Choose one</option><option value="not_confident">Not confident yet</option><option value="somewhat_confident">Somewhat confident</option><option value="confident">Confident</option></select>
  {message && <p className="mt-5 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{message}</p>}<button type="button" onClick={continueFlow} disabled={!timing||!confidence||loading} className="mt-8 w-full rounded-xl bg-[var(--navy)] py-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{loading?"Saving your plan…":goalsStep?"Build My Dashboard →":"Continue to Free Account →"}</button><p className="mt-4 text-center text-xs text-slate-500">Your study preferences can be changed later.</p></div></div></main>;
}

export default function OnboardingPage(){ return <Suspense fallback={<main className="min-h-screen bg-slate-50"/>}><OnboardingForm/></Suspense>; }
