import { motion } from "framer-motion";

export default function SessionHistoryModal({ history, onClose, onSelect }) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/45 px-4">
      <motion.div
        className="w-full max-w-3xl rounded-[32px] bg-white p-6 shadow-soft"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
              Recent sessions
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">
              Continue where you left off
            </h2>
          </div>
          <button
            className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {history.map((entry) => (
            <button
              key={entry.id}
              className="w-full rounded-3xl border border-slate-200 p-4 text-left transition hover:border-brand-300 hover:bg-brand-50"
              onClick={() => onSelect(entry)}
              type="button"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {entry.snapshot?.persona || "Career coaching session"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {entry.snapshot?.market_positioning || "Previous saved session"}
                  </p>
                </div>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-400">
                  {entry.savedAtLabel}
                </div>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
