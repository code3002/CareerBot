import { motion } from "framer-motion";

const DIMENSIONS = [
  { key: "profile_clarity", label: "Profile Clarity", description: "How clear and readable is the profile" },
  { key: "execution_evidence", label: "Execution Evidence", description: "Measurable outcomes vs. responsibilities" },
  { key: "career_narrative", label: "Career Narrative", description: "Through-line and progression logic" },
  { key: "positioning_sharpness", label: "Positioning", description: "Value proposition clarity" },
  { key: "market_readiness", label: "Market Readiness", description: "Demand for current skills" }
];

function scoreColor(score) {
  if (score >= 8) return { bar: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" };
  if (score >= 6) return { bar: "bg-brand-500", text: "text-brand-700", bg: "bg-brand-50" };
  if (score >= 4) return { bar: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50" };
  return { bar: "bg-rose-500", text: "text-rose-700", bg: "bg-rose-50" };
}

function ScoreBar({ label, score, reason, index }) {
  const colors = scoreColor(score);
  return (
    <motion.div
      className="space-y-1"
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.07, duration: 0.35 }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${colors.bg} ${colors.text}`}>
          {score}/10
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <motion.div
          className={`h-full rounded-full ${colors.bar}`}
          initial={{ width: 0 }}
          animate={{ width: `${score * 10}%` }}
          transition={{ delay: index * 0.07 + 0.15, duration: 0.6, ease: "easeOut" }}
        />
      </div>
      {reason ? (
        <p className="text-xs leading-5 text-slate-500">{reason}</p>
      ) : null}
    </motion.div>
  );
}

export default function ScorecardPanel({ scorecard, isLoading }) {
  if (isLoading) {
    return (
      <motion.section
        className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-soft"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
          Profile Strength
        </p>
        <div className="mt-4 space-y-5">
          {DIMENSIONS.map((dim) => (
            <div key={dim.key} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-32 animate-pulse rounded-full bg-slate-100" />
                <div className="h-3.5 w-10 animate-pulse rounded-full bg-slate-100" />
              </div>
              <div className="h-2 w-full animate-pulse rounded-full bg-slate-100" />
            </div>
          ))}
        </div>
      </motion.section>
    );
  }

  if (!scorecard) return null;

  const overallAvg = Math.round(
    DIMENSIONS.reduce((sum, dim) => sum + (scorecard[dim.key]?.score || 0), 0) / DIMENSIONS.length
  );
  const overallColors = scoreColor(overallAvg);

  return (
    <motion.section
      className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-soft"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
            Profile Strength
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-ink">Resume Scorecard</h3>
        </div>
        <div className={`rounded-2xl px-4 py-3 text-center ${overallColors.bg}`}>
          <p className={`text-3xl font-bold ${overallColors.text}`}>{overallAvg}</p>
          <p className={`text-xs font-semibold ${overallColors.text}`}>/ 10</p>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        {DIMENSIONS.map((dim, index) => {
          const entry = scorecard[dim.key];
          return (
            <ScoreBar
              key={dim.key}
              label={dim.label}
              score={entry?.score || 0}
              reason={entry?.reason}
              index={index}
            />
          );
        })}
      </div>

      {scorecard.overall_summary ? (
        <motion.div
          className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">
            Top priority
          </p>
          <p className="mt-1.5 text-sm leading-6 text-amber-900">{scorecard.overall_summary}</p>
        </motion.div>
      ) : null}
    </motion.section>
  );
}
