import { motion } from "framer-motion";
import { useState } from "react";

import PathCard from "./PathCard";
import PathRadarChart from "./PathRadarChart";

export default function PathCardDeck({
  intro,
  isActive,
  onReject,
  onRejectReason,
  onSelect,
  ownRound,
  paths,
  selectedPath
}) {
  const [showCompare, setShowCompare] = useState(false);

  return (
    <motion.section
      className="space-y-5"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="rounded-3xl border border-brand-100 bg-brand-50 px-5 py-4 text-sm leading-7 text-brand-900">
        {intro}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {paths.map((path, index) => (
          <PathCard
            key={path.id}
            index={index}
            isSelected={selectedPath?.title === path.title}
            onSelect={onSelect ? () => onSelect(path) : null}
            path={path}
          />
        ))}
      </div>

      <div className="flex justify-center">
        <button
          className="rounded-full border border-brand-200 bg-white px-4 py-2 text-sm font-medium text-brand-700 transition hover:bg-brand-50"
          onClick={() => setShowCompare((current) => !current)}
          type="button"
        >
          {showCompare ? "Hide comparison" : "Compare these paths"}
        </button>
      </div>

      {showCompare ? (
        <div className="space-y-4">
          <PathRadarChart paths={paths} />
          <div className="overflow-x-auto rounded-[28px] border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Path</th>
                  <th className="px-4 py-3 font-medium">Timeline</th>
                  <th className="px-4 py-3 font-medium">Salary</th>
                  <th className="px-4 py-3 font-medium">Risk</th>
                  <th className="px-4 py-3 font-medium">Best for</th>
                </tr>
              </thead>
              <tbody>
                {paths.map((path) => (
                  <tr key={`${path.id}-compare`} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-700">{path.title}</td>
                    <td className="px-4 py-3 text-slate-600">{path.timeline}</td>
                    <td className="px-4 py-3 text-slate-600">{path.salary_range}</td>
                    <td className="px-4 py-3 text-slate-600">{path.risk_level || "Medium"}</td>
                    <td className="px-4 py-3 text-slate-600">{path.best_for || "Balanced move"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {isActive ? (
        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-wrap justify-center gap-2">
            {[
              ["role", "Role mismatch"],
              ["industry", "Industry mismatch"],
              ["timeline", "Timeline mismatch"],
              ["salary", "Salary mismatch"]
            ].map(([reason, label]) => (
              <button
                key={reason}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 transition hover:border-brand-300 hover:text-brand-700"
                onClick={() => onRejectReason(reason)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          <button
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-600 transition hover:border-brand-300 hover:text-brand-700"
            onClick={onReject}
            type="button"
          >
            None of these feel right
          </button>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
            Path round {ownRound} of 3
          </p>
        </div>
      ) : (
        <p className="text-center text-xs uppercase tracking-[0.18em] text-slate-400">
          Path round {ownRound} — closed
        </p>
      )}
    </motion.section>
  );
}
