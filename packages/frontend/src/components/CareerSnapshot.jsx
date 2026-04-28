import { motion } from "framer-motion";

export default function CareerSnapshot({ snapshot }) {
  if (!snapshot) {
    return null;
  }

  return (
    <motion.section
      className="rounded-[30px] border border-brand-100 bg-white p-6 shadow-soft"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700">
          {snapshot.persona}
        </span>
        <span className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600">
          {snapshot.experience_estimate}
        </span>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          Source: {snapshot.source}
        </span>
      </div>

      <h2 className="mt-4 text-2xl font-semibold text-ink">Career snapshot</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
        {snapshot.market_positioning}
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl bg-slate-50 p-4">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
            Top strengths
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
            {(snapshot.top_strengths || []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl bg-slate-50 p-4">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
            Visible gaps
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
            {(snapshot.visible_gaps || []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl bg-brand-50 p-4">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">
            Opportunity area
          </p>
          <p className="mt-3 text-sm leading-7 text-brand-900">{snapshot.opportunity_area}</p>
        </div>
      </div>
    </motion.section>
  );
}
