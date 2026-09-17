'use client';

import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function withTimeout<T>(promise: PromiseLike<T>, ms = 12000): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('The authentication server did not respond within 12 seconds. Please try again.')), ms)),
  ]);
}

function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const track = params.get('track') === 'pn' ? 'pn' : 'rn';
  const [mode, setMode] = useState<'signup'|'signin'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true); setMessage(''); setIsError(false);
    try {
      const supabase = createClient();
      if (mode === 'signup') {
        const emailRedirectTo = `${window.location.origin}/auth?track=${track}&confirmed=1`;
        const { data, error } = await withTimeout(supabase.auth.signUp({ email: email.trim(), password, options: { data: { track }, emailRedirectTo } }));
        if (error) throw error;
        if (!data.user) throw new Error('Supabase did not create a user. Please verify the project authentication settings.');
        if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          setIsError(true); setMessage('An account already exists for this email. Please sign in instead.'); setMode('signin'); return;
        }
        setMessage(data.session ? 'Account created and signed in.' : 'Account created. Check your email for the confirmation link, then return here and sign in.');
        setMode('signin');
      } else {
        const { data, error } = await withTimeout(supabase.auth.signInWithPassword({ email: email.trim(), password }));
        if (error) throw error;
        if (!data.user) throw new Error('Sign in succeeded but no user was returned. Please try again.');
        const { data: profile, error: profileError } = await supabase.from('profiles').select('exam_track,onboarding_complete').eq('id', data.user.id).maybeSingle();
        if (profileError) throw profileError;
        const savedTrack = profile?.exam_track === 'pn' ? 'pn' : profile?.exam_track === 'rn' ? 'rn' : track;
        router.replace(profile?.onboarding_complete ? `/dashboard?track=${savedTrack}` : `/onboarding?track=${savedTrack}`);
      }
    } catch (err) {
      setIsError(true); setMessage(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
    } finally { setLoading(false); }
  }

  const label = track === 'pn' ? 'PN' : 'RN';
  const switchMode=(next:'signup'|'signin')=>{setMode(next);setMessage('');setIsError(false)};
  return <main className="min-h-screen bg-slate-50"><header className="bg-[var(--deep-navy)] px-6 py-5 text-white"><div className="mx-auto flex max-w-5xl items-center justify-between"><a href="/" className="text-xl font-black">NursePrep<span className="text-[var(--aqua)]">IQ</span></a><span className="text-sm font-bold text-cyan-100">NCLEX-{label}® Prep</span></div></header><section className="mx-auto grid max-w-5xl gap-10 px-6 py-16 md:grid-cols-2 md:items-center"><div><p className="font-black tracking-wider text-[var(--teal)]">YOUR NCLEX-{label} JOURNEY STARTS HERE</p><h1 className="mt-3 text-4xl font-black text-[var(--deep-navy)]">Build your {label} prep plan around <span className="text-[var(--teal)]">you.</span></h1><p className="mt-5 text-lg leading-8 text-slate-600">Save your progress, identify weak areas, and turn every practice session into a smarter next step.</p><div className="mt-8 space-y-3 font-semibold text-slate-700"><p>✓ Personalized NCLEX-{label} preparation</p><p>✓ Progress and question history</p><p>✓ Clinical-judgment focused practice</p></div></div><div className="rounded-[2rem] bg-white p-7 shadow-xl ring-1 ring-slate-200"><div className="mb-6"><p className="text-xs font-black uppercase tracking-[.16em] text-[var(--teal)]">{mode==='signin'?'Welcome back':'New to NursePrepIQ?'}</p><h2 className="mt-1 text-2xl font-black text-[var(--deep-navy)]">{mode==='signin'?'Sign in to continue':'Create your free account'}</h2><p className="mt-1 text-sm text-slate-500">{mode==='signin'?'Continue your study plan and saved progress.':'Start saving progress and building your personalized prep plan.'}</p></div><form onSubmit={submit} className="space-y-4"><label className="block text-sm font-bold text-slate-700">Email<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[var(--teal)]" placeholder="you@example.com" /></label><label className="block text-sm font-bold text-slate-700">Password<input required minLength={6} type="password" autoComplete={mode==='signup'?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[var(--teal)]" placeholder="At least 6 characters" /></label>{message && <div role={isError?'alert':'status'} className={`rounded-xl border p-3 text-sm font-semibold ${isError?'border-rose-200 bg-rose-50 text-rose-800':'border-cyan-200 bg-cyan-50 text-slate-700'}`}>{isError&&<p className="mb-1 font-black">We couldn’t complete authentication.</p>}<p>{message}</p></div>}<button disabled={loading} className="w-full rounded-xl bg-[var(--blue)] py-3.5 font-extrabold text-white disabled:cursor-wait disabled:opacity-60">{loading?'Connecting securely…':mode==='signup'?'Create Free Account →':'Sign In →'}</button></form><div className="mt-6 border-t border-slate-200 pt-5 text-center"><p className="text-sm font-semibold text-slate-600">{mode==='signin'?"Don't have an account yet?":'Already have an account?'}</p><button type="button" disabled={loading} onClick={()=>switchMode(mode==='signin'?'signup':'signin')} className="mt-2 font-black text-[var(--blue)] underline decoration-2 underline-offset-4 hover:text-[var(--deep-navy)]">{mode==='signin'?'Create a free account':'Sign in to your account'}</button></div><p className="mt-4 text-center text-xs text-slate-500">Free to start. No credit card required.</p></div></section></main>;
}

export default function AuthPage(){return <Suspense fallback={<main className="min-h-screen bg-slate-50"/>}><AuthForm/></Suspense>}
