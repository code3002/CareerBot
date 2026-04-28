const STAGES = [
  "Profile analyzed",
  "Clarifying goals",
  "Comparing paths",
  "Planning next move"
];

export default function ProgressTracker({ currentStage }) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      {STAGES.map((label, index) => {
        const step = index + 1;
        const active = currentStage >= step;

        return (
          <div
            key={label}
            className={`rounded-2xl border px-4 py-3 text-sm transition ${
              active
                ? "border-brand-200 bg-brand-50 text-brand-900"
                : "border-slate-200 bg-white text-slate-500"
            }`}
          >
            <div className="text-xs font-semibold uppercase tracking-[0.16em]">
              Step {step}
            </div>
            <div className="mt-2 font-medium">{label}</div>
          </div>
        );
      })}
    </div>
  );
}
