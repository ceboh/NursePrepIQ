'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Attempt = { subject: string | null; is_correct: boolean | null };

const categories = [
  { name: 'Fundamentals', icon: '🩺', description: 'Core nursing care, assessment, mobility, comfort, and basic skills.' },
  { name: 'Adult Health', icon: '❤️', description: 'Medical-surgical nursing across major body systems.', featured: true },
  { name: 'Pharmacology', icon: '💊', description: 'Medication safety, adverse effects, administration, and teaching.' },
  { name: 'Mental Health', icon: '🧠', description: 'Therapeutic communication, psychiatric disorders, and crisis care.' },
  { name: 'Maternal & Newborn', icon: '🤰', description: 'Antepartum, labor, postpartum, and newborn nursing care.' },
  { name: 'Pediatrics', icon: '👶', description: 'Growth, development, pediatric illness, and family-centered care.' },
  { name: 'Management of Care', icon: '📋', description: 'Prioritization, delegation, assignment, and coordinated care.' },
  { name: 'Safety & Infection Control', icon: '🛡️', description: 'Precautions, prevention, safe environments, and error reduction.' },
  { name: 'NGN Clinical Judgment', icon: '🧩', description: 'Practice the six clinical-judgment steps with NCLEX-style scenarios.' },
];

export default function PracticeHub() {
  const router = useRouter();
  const params = useSearchParams();
  const requestedTrack = params.get('track') === 'pn' ? 'pn' : 'rn';
  const [track, setTrack] = useState<'rn' | 'pn'>(requestedTrack);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { router.replace(`/auth?track=${requestedTrack}`); return; }
      const [{ data: profile }, { data: history }] = await Promise.all([
        supabase.from('profiles').select('exam_track').eq('id', auth.user.id).maybeSingle(),
        supabase.from('question_attempts').select('subject,is_correct').eq('user_id', auth.user.id),
      ]);
      if (!active) return;
      setTrack(profile?.exam_track === 'pn' ? 'pn' : 'rn');
      setAttempts((history ?? []) as Attempt[]);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [router, requestedTrack]);

  const stats = useMemo(() => {
    const total = attempts.length;
    const correct = attempts.filter(a => a.is_correct).length;
    return { total, accuracy: total ? Math.round((correct / total) * 100) : 0 };
  }, [attempts]);

  return <main className="min-h-screen bg-slate-50 text-slate-900"><header className="bg-[var(--deep-navy)] px-6 py-5 text-white"><div className="mx-auto flex max-w-6xl items-center justify-between"><Link href={`/dashboard?track=${track}`} className="text-xl font-black">NursePrep<span className="text-[var(--aqua)]">IQ</span></Link><div className="flex items-center gap-4"><span className="rounded-full bg-white/10 px-3 py-1 text-sm font-bold">NCLEX-{track.toUpperCase()}</span><Link href={`/dashboard?track=${track}`} className="text-sm font-bold text-cyan-100 hover:text-white">Dashboard</Link></div></div></header><section className="mx-auto max-w-6xl px-6 py-12"><div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="font-black tracking-wider text-[var(--teal)]">PRACTICE QUESTIONS</p><h1 className="mt-2 text-4xl font-black text-[var(--deep-navy)]">Choose what you want to strengthen.</h1><p className="mt-3 max-w-2xl text-lg text-slate-600">Practice by nursing area while NursePrepIQ tracks your performance and helps expose the topics that need more attention.</p></div><div className="flex gap-3"><div className="rounded-2xl bg-white px-5 py-3 shadow-sm ring-1 ring-slate-200"><p className="text-xs font-bold uppercase text-slate-500">Answered</p><p className="text-2xl font-black text-[var(--deep-navy)]">{loading ? '—' : stats.total}</p></div><div className="rounded-2xl bg-white px-5 py-3 shadow-sm ring-1 ring-slate-200"><p className="text-xs font-bold uppercase text-slate-500">Accuracy</p><p className="text-2xl font-black text-[var(--teal)]">{loading ? '—' : `${stats.accuracy}%`}</p></div></div></div><div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{categories.map(category => { const available = category.name === 'Adult Health'; return <article key={category.name} className={`rounded-[1.5rem] bg-white p-6 shadow-sm ring-1 ${category.featured ? 'ring-cyan-300' : 'ring-slate-200'}`}><div className="flex items-start justify-between"><span className="text-3xl" aria-hidden>{category.icon}</span>{available ? <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-[var(--teal)]">READY</span> : <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">EXPANDING</span>}</div><h2 className="mt-5 text-xl font-black text-[var(--deep-navy)]">{category.name}</h2><p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{category.description}</p>{available ? <Link href={`/practice/adult-health?track=${track}`} className="mt-6 inline-flex w-full justify-center rounded-xl bg-[var(--blue)] px-4 py-3 font-extrabold text-white">Explore Adult Health →</Link> : <div className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-center text-sm font-bold text-slate-400">More questions coming next</div>}</article>; })}</div></section></main>;
}
