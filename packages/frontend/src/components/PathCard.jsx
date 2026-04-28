import { motion } from "framer-motion";

export default function PathCard({ index, isSelected, onSelect, path }) {
  return (
    <motion.article
      className={`flex h-full flex-col rounded-[28px] border bg-white p-5 shadow-soft transition ${
        isSelected
          ? "border-brand-300 ring-4 ring-brand-100"
          : "border-slate-200"
      }`}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 140,
        damping: 18,
        delay: index * 0.08
      }}
      whileHover={{ y: -6, scale: 1.01 }}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="mb-3 text-3xl">{path.emoji}</div>
          <h3 className="text-xl font-semibold leading-snug text-ink">{path.title}</h3>
        </div>
        <div className="space-y-2 text-right">
          <div className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
            {path.best_for || "Fit"}
          </div>
          <div className="text-xs font-medium text-slate-500">
            Confidence {path.confidence || "7"}/10
          </div>
        </div>
      </div>

      <div className="mb-5 space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
          Why this fits you
        </p>
        <p className="text-sm italic leading-7 text-slate-600">{path.why_it_fits}</p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700">
          Skill gap: {path.skill_gap}
        </span>
        <span className="rounded-full bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700">
          {path.timeline}
        </span>
        <span className="rounded-full bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
          Risk: {path.risk_level || "Medium"}
        </span>
      </div>

      <p className="mb-5 text-lg font-semibold text-emerald-600">{path.salary_range}</p>

      <div className="mb-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-semibold text-slate-700">First proof-of-fit</p>
        <p className="mt-2 leading-6">{path.first_milestone}</p>
      </div>

      <div className="mb-4 rounded-2xl border border-slate-200 p-4 text-sm text-slate-600">
        <p className="font-semibold text-slate-700">Why not this path</p>
        <p className="mt-2 leading-6">{path.why_not_this}</p>
      </div>

      <div className="mb-5 rounded-2xl bg-mint/40 p-4 text-sm text-slate-700">
        <p className="font-semibold">Market signal</p>
        <p className="mt-2 leading-6">{path.market_signal}</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {(path.example_companies || []).map((company) => (
          <span
            key={company}
            className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600"
          >
            {company}
          </span>
        ))}
      </div>

      {onSelect ? (
        <button
          className="mt-auto rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          onClick={onSelect}
          type="button"
        >
          This is my path →
        </button>
      ) : (
        <div className="mt-auto rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm text-slate-400">
          {isSelected ? "Selected path" : "Round closed"}
        </div>
      )}
    </motion.article>
  );
}
