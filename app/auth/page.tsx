'use client';

import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AuthPage() {
  const router = useRouter();
  const params = useSearchParams();
  const track = params.get('track') === 'pn' ? 'pn' : 'rn';
  const [mode, setMode] = useState<'signup'|'signin'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault(); setLoading(true); setMessage('');
    const supabase = createClient();
    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { track } } });
      if (error) setMessage(error.message); else { setMessage('Account created. If email confirmation is enabled, check your inbox, then sign in.'); setMode('signin'); }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message); else router.push(`/onboarding?track=${track}&step=goals`);
    }
    setLoading(false);
  }

  return <main className="min-h-screen bg-slate-50"><header className="bg-[var(--deep-navy)] px-6 py-5 text-white"><div className="mx-auto flex max-w-5xl items-center justify-between"><a href="/" className="text-xl font-black">NursePrep<span className="text-[var(--aqua)]">IQ</span></a><span className="text-sm font-bold text-cyan-100">{track.toUpperCase()} • NCLEX Prep</span></div></header><section className="mx-auto grid max-w-5xl gap-10 px-6 py-16 md:grid-cols-2 md:items-center"><div><p className="font-black tracking-wider text-[var(--teal)]">YOUR NCLEX JOURNEY STARTS HERE</p><h1 className="mt-3 text-4xl font-black text-[var(--deep-navy)]">Build a prep plan around <span className="text-[var(--teal)]">you.</span></h1><p className="mt-5 text-lg leading-8 text-slate-600">Save your progress, identify weak areas, and turn every practice session into a smarter next step.</p><div className="mt-8 space-y-3 font-semibold text-slate-700"><p>✓ Personalized RN or PN preparation</p><p>✓ Progress and question history</p><p>✓ Clinical-judgment focused practice</p></div></div><div className="rounded-[2rem] bg-white p-7 shadow-xl ring-1 ring-slate-200"><div className="mb-6 flex rounded-xl bg-slate-100 p-1"><button onClick={()=>setMode('signup')} className={`flex-1 rounded-lg py-2.5 font-bold ${mode==='signup'?'bg-white text-[var(--deep-navy)] shadow':'text-slate-500'}`}>Create account</button><button onClick={()=>setMode('signin')} className={`flex-1 rounded-lg py-2.5 font-bold ${mode==='signin'?'bg-white text-[var(--deep-navy)] shadow':'text-slate-500'}`}>Sign in</button></div><form onSubmit={submit} className="space-y-4"><label className="block text-sm font-bold text-slate-700">Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[var(--teal)]" placeholder="you@example.com" /></label><label className="block text-sm font-bold text-slate-700">Password<input required minLength={6} type="password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[var(--teal)]" placeholder="At least 6 characters" /></label>{message && <p className="rounded-xl bg-cyan-50 p-3 text-sm font-semibold text-slate-700">{message}</p>}<button disabled={loading} className="w-full rounded-xl bg-[var(--blue)] py-3.5 font-extrabold text-white disabled:opacity-60">{loading?'Please wait…':mode==='signup'?'Create Free Account →':'Sign In →'}</button></form><p className="mt-4 text-center text-xs text-slate-500">Free to start. No credit card required.</p></div></section></main>;
}
