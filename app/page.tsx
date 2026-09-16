const features = [
  ["01", "Learn simply", "Short, focused lessons turn difficult nursing concepts into memorable clinical reasoning."],
  ["02", "Practice realistically", "Original RN and PN exam-style questions with clear rationales and clinical-judgment training."],
  ["03", "Understand mistakes", "See the clue you missed, why the best answer is safest, and a memory rule you can reuse."],
  ["04", "Improve intelligently", "Your performance shapes targeted practice instead of giving you more random questions."],
];

const tools = ["Simple Lessons", "Practice Questions", "Clinical Judgment", "NGN-Style Cases", "Adaptive Practice", "Exam Simulation"];

export default function Home() {
  return (
    <main className="overflow-hidden bg-white">
      <div className="hero-shell text-white">
        <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
          <a href="/" className="text-xl font-black tracking-tight text-white">NursePrep<span className="text-[var(--aqua)]">IQ</span></a>
          <nav className="hidden gap-7 text-sm font-semibold text-slate-200 md:flex">
            <a className="transition hover:text-white" href="#paths">NCLEX-RN Prep</a><a className="transition hover:text-white" href="#paths">NCLEX-PN Prep</a><a className="transition hover:text-white" href="#how">How it works</a><a className="transition hover:text-white" href="#practice">Practice</a>
          </nav>
          <a href="#paths" className="rounded-xl bg-[var(--aqua)] px-5 py-2.5 text-sm font-extrabold text-[var(--deep-navy)] shadow-lg shadow-cyan-950/20 transition hover:-translate-y-0.5 hover:bg-white">Start NCLEX Prep</a>
        </header>

        <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-6 pb-24 pt-16 lg:grid-cols-[1.08fr_.92fr] lg:px-8 lg:pb-28 lg:pt-20">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-extrabold tracking-wide text-cyan-100"><span className="h-2 w-2 rounded-full bg-[var(--aqua)] shadow-[0_0_16px_#20d6d2]" /> NCLEX-RN® & NCLEX-PN® PREP</div>
            <h1 className="max-w-3xl text-5xl font-black leading-[1.02] tracking-[-0.04em] text-white md:text-6xl lg:text-7xl">Prepare smarter for the <span className="gradient-word">NCLEX.</span></h1>
            <h2 className="mt-4 text-2xl font-extrabold text-cyan-100 md:text-3xl">Learn how to think, not just memorize.</h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">Master nursing concepts, clinical judgment, and question-solving skills for the NCLEX-RN® or NCLEX-PN® with simple lessons, original exam-style questions, detailed rationales, and realistic practice.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#paths" className="rounded-xl bg-[var(--aqua)] px-6 py-3.5 font-extrabold text-[var(--deep-navy)] shadow-xl shadow-cyan-950/25 transition hover:-translate-y-1 hover:bg-white">Start NCLEX Prep Free →</a>
              <a href="#practice" className="rounded-xl border border-white/30 bg-white/10 px-6 py-3.5 font-bold text-white backdrop-blur transition hover:bg-white/20">Try Free NCLEX Questions</a>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-cyan-50"><span>✓ No credit card</span><span>✓ RN & PN tracks</span><span>✓ Clinical judgment focused</span></div>
          </div>

          <div className="relative">
            <div className="absolute -inset-8 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="relative rounded-[2rem] border border-white/30 bg-white p-6 text-[var(--ink)] shadow-2xl shadow-slate-950/30 md:p-7">
              <div className="mb-5 flex items-start justify-between"><div><p className="text-xs font-black tracking-[.16em] text-[var(--blue)]">TODAY’S NCLEX FOCUS</p><h2 className="mt-1 text-2xl font-black text-[var(--deep-navy)]">Clinical priorities</h2></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-extrabold text-emerald-800">FREE</span></div>
              <div className="mb-5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-[38%] rounded-full progress-gradient" /></div>
              <div className="space-y-3">
                {["Heart Failure Made Simple", "10 NCLEX priority questions", "Recognize Cues mini-drill"].map((item, i) => <div key={item} className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:border-cyan-200 hover:bg-cyan-50"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--deep-navy)] font-black text-[var(--aqua)]">{i+1}</span><span className="font-bold text-slate-800">{item}</span></div>)}
              </div>
              <button className="mt-5 w-full rounded-xl bg-[var(--blue)] py-3.5 font-extrabold text-white shadow-lg shadow-blue-200 transition hover:bg-[var(--deep-navy)]">Start today’s NCLEX session →</button>
              <div className="mt-4 flex items-center justify-between text-xs font-semibold text-slate-500"><span>Personalized daily practice</span><span>~25 min</span></div>
            </div>
          </div>
        </section>
      </div>

      <section id="paths" className="relative mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="text-center"><p className="font-black tracking-[.12em] text-[var(--teal)]">CHOOSE YOUR NCLEX PATH</p><h2 className="mt-3 text-4xl font-black tracking-tight text-[var(--deep-navy)] md:text-5xl">Built for the exam you’re preparing for</h2><p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">Choose your track and NursePrepIQ will organize your learning, practice, and progress around it.</p></div>
        <div className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-2">
          <a href="/onboarding?track=rn" className="path-card group rounded-[2rem] border border-blue-100 bg-white p-8 shadow-xl shadow-blue-950/5 transition hover:-translate-y-2 hover:shadow-2xl"><div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-blue-100 text-xl font-black text-[var(--blue)]">RN</div><span className="text-sm font-black tracking-wider text-[var(--blue)]">REGISTERED NURSE</span><h3 className="mt-2 text-3xl font-black text-[var(--deep-navy)]">NCLEX-RN® Prep <span className="transition group-hover:translate-x-1">→</span></h3><p className="mt-4 leading-7 text-slate-600">Build clinical judgment, prioritization, management of care, pharmacology, and comprehensive nursing knowledge.</p><div className="mt-6 font-extrabold text-[var(--blue)]">Start RN preparation</div></a>
          <a href="/onboarding?track=pn" className="path-card group rounded-[2rem] border border-cyan-100 bg-white p-8 shadow-xl shadow-cyan-950/5 transition hover:-translate-y-2 hover:shadow-2xl"><div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-cyan-100 text-xl font-black text-[var(--teal)]">PN</div><span className="text-sm font-black tracking-wider text-[var(--teal)]">PRACTICAL / VOCATIONAL NURSE</span><h3 className="mt-2 text-3xl font-black text-[var(--deep-navy)]">NCLEX-PN® Prep <span>→</span></h3><p className="mt-4 leading-7 text-slate-600">Practice safe, coordinated care, pharmacology, health promotion, and practical nursing clinical judgment.</p><div className="mt-6 font-extrabold text-[var(--teal)]">Start PN preparation</div></a>
        </div>
      </section>

      <section id="practice" className="bg-[var(--soft-aqua)] py-16"><div className="mx-auto max-w-7xl px-6 lg:px-8"><div className="text-center"><p className="font-black tracking-wider text-[var(--teal)]">YOUR NCLEX TOOLKIT</p><h2 className="mt-2 text-3xl font-black text-[var(--deep-navy)] md:text-4xl">Everything works together to build clinical judgment.</h2></div><div className="mx-auto mt-8 flex max-w-5xl flex-wrap justify-center gap-3">{tools.map((tool, i) => <span key={tool} className="rounded-full border border-cyan-200 bg-white px-5 py-3 font-bold text-[var(--deep-navy)] shadow-sm"><span className="mr-2 text-[var(--teal)]">{String(i+1).padStart(2,"0")}</span>{tool}</span>)}</div></div></section>

      <section id="how" className="how-shell py-20 text-white"><div className="mx-auto max-w-7xl px-6 lg:px-8"><p className="font-black tracking-[.14em] text-[var(--aqua)]">HOW NURSEPREPIQ WORKS</p><h2 className="mt-3 max-w-3xl text-4xl font-black tracking-tight md:text-5xl">Learn → Practice → Understand → <span className="text-[var(--aqua)]">Improve</span></h2><div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">{features.map(([number,title,body]) => <div key={title} className="rounded-3xl border border-white/10 bg-white/[.08] p-6 backdrop-blur transition hover:-translate-y-1 hover:bg-white/[.12]"><div className="text-sm font-black text-[var(--aqua)]">{number}</div><h3 className="mt-4 text-xl font-black">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-200">{body}</p></div>)}</div></div></section>

      <section className="mx-auto max-w-5xl px-6 py-20 text-center"><div className="rounded-[2rem] bg-gradient-to-br from-cyan-50 to-blue-50 px-6 py-12 ring-1 ring-cyan-100 md:px-12"><p className="font-black tracking-wider text-[var(--teal)]">START WITH UNDERSTANDING</p><h2 className="mt-3 text-4xl font-black text-[var(--deep-navy)]">Ready to start thinking like the NCLEX?</h2><p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-600">Start free with original practice and focused teaching designed to strengthen the reasoning behind every answer.</p><a href="#paths" className="mt-7 inline-block rounded-xl bg-[var(--blue)] px-7 py-4 font-extrabold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-1 hover:bg-[var(--deep-navy)]">Start NCLEX Prep Free →</a></div></section>
      <footer className="border-t border-slate-200 bg-white px-6 py-9 text-center text-sm leading-6 text-slate-500">© 2026 NursePrepIQ. Independent nursing education platform. NCLEX®, NCLEX-RN®, and NCLEX-PN® are registered trademarks of the National Council of State Boards of Nursing, Inc. NursePrepIQ is not affiliated with or endorsed by NCSBN.</footer>
    </main>
  );
}
