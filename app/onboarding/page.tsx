"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function OnboardingForm() {
  const params = useSearchParams();
  const initial = params.get("track") === "pn" ? "PN" : "RN";
  const [track, setTrack] = useState(initial);
  const [timing, setTiming] = useState("");
  const [confidence, setConfidence] = useState("");

  return <main className="min-h-screen bg-slate-50 px-6 py-10"><div className="mx-auto max-w-2xl"><a href="/" className="text-xl font-extrabold text-[var(--navy)]">NursePrep<span className="text-[var(--teal)]">IQ</span></a><div className="mt-8 rounded-3xl bg-white p-7 shadow-sm ring-1 ring-slate-200 md:p-10"><p className="text-sm font-bold text-[var(--teal)]">YOUR STUDY PATH</p><h1 className="mt-2 text-3xl font-black text-[var(--navy)]">Tell us what you’re preparing for.</h1><p className="mt-3 text-slate-600">We’ll use this to personalize your dashboard and future practice.</p>
  <label className="mt-8 block font-bold">Exam track</label><div className="mt-3 grid grid-cols-2 gap-3">{["RN","PN"].map(x=><button key={x} onClick={()=>setTrack(x)} className={`rounded-xl border p-4 font-extrabold ${track===x?"border-[var(--teal)] bg-[var(--light-teal)] text-[var(--teal)]":"border-slate-200"}`}>{x} Prep</button>)}</div>
  <label className="mt-7 block font-bold">When do you plan to test?</label><select value={timing} onChange={e=>setTiming(e.target.value)} className="mt-3 w-full rounded-xl border border-slate-300 bg-white p-3.5"><option value="">Choose one</option><option>Within 30 days</option><option>1–2 months</option><option>3–6 months</option><option>Not scheduled yet</option></select>
  <label className="mt-7 block font-bold">How confident do you feel right now?</label><select value={confidence} onChange={e=>setConfidence(e.target.value)} className="mt-3 w-full rounded-xl border border-slate-300 bg-white p-3.5"><option value="">Choose one</option><option>Not confident yet</option><option>Somewhat confident</option><option>Confident</option></select>
  <button disabled={!timing||!confidence} className="mt-8 w-full rounded-xl bg-[var(--navy)] py-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Continue to free account</button><p className="mt-4 text-center text-xs text-slate-500">Account creation and saved progress are coming in the next build step.</p></div></div></main>;
}

export default function OnboardingPage(){ return <Suspense fallback={<main className="min-h-screen bg-slate-50"/>}><OnboardingForm/></Suspense>; }
