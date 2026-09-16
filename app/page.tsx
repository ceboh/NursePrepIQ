const features = [
  ["Learn simply", "Short, focused lessons turn difficult nursing concepts into memorable clinical reasoning."],
  ["Practice realistically", "Original RN and PN exam-style questions with clear rationales and clinical-judgment training."],
  ["Understand mistakes", "See the clue you missed, why the best answer is safest, and a memory rule you can reuse."],
  ["Improve intelligently", "Your performance will shape targeted practice instead of giving you more random questions."],
];

export default function Home() {
  return (
    <main>
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
        <a href="/" className="text-xl font-extrabold tracking-tight text-[var(--navy)]">NursePrep<span className="text-[var(--teal)]">IQ</span></a>
        <nav className="hidden gap-7 text-sm font-semibold text-slate-600 md:flex">
          <a href="#paths">RN Prep</a><a href="#paths">PN Prep</a><a href="#how">How it works</a><a href="#practice">Practice</a>
        </nav>
        <a href="#paths" className="rounded-xl bg-[var(--navy)] px-4 py-2.5 text-sm font-bold text-white">Start Free</a>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:px-8 lg:py-24">
        <div>
          <div className="mb-5 inline-flex rounded-full bg-[var(--light-teal)] px-4 py-2 text-sm font-bold text-[var(--teal)]">NCLEX preparation made simple</div>
          <h1 className="max-w-3xl text-5xl font-black leading-[1.05] tracking-tight text-[var(--navy)] md:text-6xl">Don’t just memorize. <span className="text-[var(--teal)]">Learn how to think.</span></h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">Simple lessons, original exam-style practice, clinical-judgment training, and personalized preparation for RN and PN candidates.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#paths" className="rounded-xl bg-[var(--teal)] px-6 py-3.5 font-bold text-white shadow-sm">Start Preparing Free</a>
            <a href="#practice" className="rounded-xl border border-slate-300 bg-white px-6 py-3.5 font-bold text-[var(--navy)]">Try Free Practice</a>
          </div>
          <p className="mt-4 text-sm text-slate-500">No credit card required.</p>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/60 ring-1 ring-slate-200">
          <div className="mb-5 flex items-center justify-between"><div><p className="text-sm font-semibold text-slate-500">TODAY’S FOCUS</p><h2 className="mt-1 text-2xl font-extrabold text-[var(--navy)]">Clinical priorities</h2></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">Free</span></div>
          <div className="space-y-3">
            {["Heart Failure Made Simple", "10 priority practice questions", "Recognize Cues mini-drill"].map((item, i) => <div key={item} className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4"><span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--light-teal)] font-extrabold text-[var(--teal)]">{i+1}</span><span className="font-semibold">{item}</span></div>)}
          </div>
          <button className="mt-5 w-full rounded-xl bg-[var(--navy)] py-3.5 font-bold text-white">Start today’s session</button>
        </div>
      </section>

      <section id="paths" className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="text-center"><p className="font-bold text-[var(--teal)]">CHOOSE YOUR PATH</p><h2 className="mt-2 text-3xl font-black text-[var(--navy)] md:text-4xl">Built for the exam you’re preparing for</h2></div>
        <div className="mx-auto mt-8 grid max-w-4xl gap-5 md:grid-cols-2">
          <a href="/onboarding?track=rn" className="group rounded-3xl bg-white p-7 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-lg"><span className="text-sm font-bold text-[var(--teal)]">REGISTERED NURSE</span><h3 className="mt-2 text-2xl font-extrabold text-[var(--navy)]">RN Prep →</h3><p className="mt-3 leading-7 text-slate-600">Build clinical judgment, prioritization, management-of-care, pharmacology, and comprehensive nursing knowledge.</p></a>
          <a href="/onboarding?track=pn" className="group rounded-3xl bg-white p-7 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-lg"><span className="text-sm font-bold text-[var(--teal)]">PRACTICAL / VOCATIONAL NURSE</span><h3 className="mt-2 text-2xl font-extrabold text-[var(--navy)]">PN Prep →</h3><p className="mt-3 leading-7 text-slate-600">Practice safe, coordinated care, pharmacology, health promotion, and practical nursing clinical judgment.</p></a>
        </div>
      </section>

      <section id="how" className="mt-10 bg-[var(--navy)] py-16 text-white"><div className="mx-auto max-w-7xl px-6 lg:px-8"><p className="font-bold text-cyan-300">HOW NURSEPREPIQ WORKS</p><h2 className="mt-2 max-w-2xl text-3xl font-black md:text-4xl">Learn → Practice → Understand → Improve</h2><div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">{features.map(([title, body]) => <div key={title} className="rounded-2xl bg-white/10 p-5 ring-1 ring-white/10"><h3 className="text-lg font-extrabold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-200">{body}</p></div>)}</div></div></section>

      <section id="practice" className="mx-auto max-w-5xl px-6 py-16 text-center"><p className="font-bold text-[var(--teal)]">START WITH UNDERSTANDING</p><h2 className="mt-2 text-3xl font-black text-[var(--navy)]">A smarter question bank starts with better teaching.</h2><p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-600">NursePrepIQ is being built as an independent nursing licensure-preparation platform. Practice items are original educational content, not actual examination questions.</p><a href="#paths" className="mt-7 inline-block rounded-xl bg-[var(--teal)] px-6 py-3.5 font-bold text-white">Choose RN or PN</a></section>
      <footer className="border-t border-slate-200 bg-white px-6 py-8 text-center text-sm text-slate-500">© 2026 NursePrepIQ. Independent nursing education platform.</footer>
    </main>
  );
}
