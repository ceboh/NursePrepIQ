import Link from 'next/link';

export default async function AdultHealthPage({ searchParams }: { searchParams: Promise<{ track?: string }> }) {
  const params = await searchParams;
  const track = params.track === 'pn' ? 'pn' : 'rn';
  const topics = [
    { name: 'Cardiovascular', description: 'Heart failure, perfusion, rhythm, and vascular concepts.', ready: true },
    { name: 'Respiratory', description: 'Oxygenation, ventilation, airway, and respiratory disorders.' },
    { name: 'Neurologic', description: 'Neurologic assessment, stroke, seizures, and intracranial care.' },
    { name: 'Renal & Urinary', description: 'Fluid balance, renal function, dialysis, and urinary disorders.' },
    { name: 'Endocrine', description: 'Diabetes, thyroid, adrenal, and metabolic disorders.' },
    { name: 'Gastrointestinal', description: 'GI assessment, nutrition, liver, and bowel disorders.' },
  ];
  return <main className="min-h-screen bg-slate-50"><header className="bg-[var(--deep-navy)] px-6 py-5 text-white"><div className="mx-auto flex max-w-5xl items-center justify-between"><Link href={`/practice?track=${track}`} className="text-xl font-black">NursePrep<span className="text-[var(--aqua)]">IQ</span></Link><Link href={`/practice?track=${track}`} className="text-sm font-bold text-cyan-100">← Practice Library</Link></div></header><section className="mx-auto max-w-5xl px-6 py-12"><p className="font-black tracking-wider text-[var(--teal)]">ADULT HEALTH</p><h1 className="mt-2 text-4xl font-black text-[var(--deep-navy)]">Build system-by-system confidence.</h1><p className="mt-3 max-w-2xl text-lg text-slate-600">Choose a body system. Your available practice will automatically stay aligned with your NCLEX-{track.toUpperCase()} track.</p><div className="mt-9 grid gap-5 md:grid-cols-2">{topics.map(topic => <article key={topic.name} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"><div className="flex items-center justify-between"><h2 className="text-xl font-black text-[var(--deep-navy)]">{topic.name}</h2>{topic.ready && <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-[var(--teal)]">AVAILABLE</span>}</div><p className="mt-2 text-sm leading-6 text-slate-600">{topic.description}</p>{topic.ready ? <div className="mt-5 rounded-2xl bg-[var(--soft-aqua)] p-4"><p className="text-xs font-black uppercase tracking-wide text-[var(--teal)]">Cardiovascular topic</p><h3 className="mt-1 font-black text-[var(--deep-navy)]">Heart Failure</h3><p className="mt-1 text-sm text-slate-600">3 pilot questions • Clinical judgment rationales</p><Link href={`/practice/heart-failure?track=${track}`} className="mt-4 inline-flex rounded-xl bg-[var(--blue)] px-4 py-2.5 text-sm font-extrabold text-white">Start Heart Failure Practice →</Link></div> : <p className="mt-5 text-sm font-bold text-slate-400">Question set in development</p>}</article>)}</div></section></main>;
}
