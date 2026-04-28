import { useState } from "react";
import { motion } from "framer-motion";

export default function ActionPlan({ content, onRestart }) {
  const [copied, setCopied] = useState(false);

  function handleCopyOutreach() {
    const text = content.resume_tailoring?.outreach_message || "";
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <motion.section
      className="rounded-[30px] border border-brand-100 bg-white p-6 shadow-soft sm:p-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
        Your 4-Week Plan
      </p>
      <h2 className="mt-3 text-3xl font-semibold text-ink">{content.selected_path}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{content.message}</p>

      {content.gap_analysis ? (
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl bg-slate-50 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
              Gap analysis
            </p>
            <div className="mt-4 space-y-4 text-sm text-slate-700">
              <div>
                <p className="font-semibold">Already have</p>
                <ul className="mt-2 list-disc pl-5">
                  {(content.gap_analysis.already_have || []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold">Missing now</p>
                <ul className="mt-2 list-disc pl-5">
                  {(content.gap_analysis.missing_now || []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold">Nice to have</p>
                <ul className="mt-2 list-disc pl-5">
                  {(content.gap_analysis.nice_to_have || []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-brand-100 bg-brand-50 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">
              Resume tailoring
            </p>
            <p className="mt-4 text-sm font-semibold text-slate-700">
              {content.resume_tailoring?.headline}
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {content.resume_tailoring?.summary}
            </p>
            <div className="mt-4">
              <p className="font-semibold text-slate-700">Bullet rewrites</p>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-600">
                {(content.resume_tailoring?.bullet_rewrites || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="mt-4 rounded-2xl bg-white/70 p-4 text-sm text-slate-700">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">Outreach draft</p>
                <button
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500 transition hover:border-brand-300 hover:text-brand-700"
                  onClick={handleCopyOutreach}
                  type="button"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="mt-2 leading-7">
                {content.resume_tailoring?.outreach_message}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="relative mt-8 space-y-6 before:absolute before:left-5 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-brand-100">
        {content.steps.map((step) => (
          <div key={step.week} className="relative flex gap-4">
            <div className="relative z-[1] flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white shadow-lg shadow-brand-600/20">
              {step.week}
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
                Week {step.week}
              </p>
              <p className="mt-2 text-[15px] leading-7 text-slate-700">{step.action}</p>
              <div className="mt-3 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 sm:grid-cols-3">
                <div>
                  <p className="font-semibold text-slate-700">Deliverable</p>
                  <p className="mt-1">{step.deliverable}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-700">Time</p>
                  <p className="mt-1">{step.time_commitment}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-700">Success metric</p>
                  <p className="mt-1">{step.success_metric}</p>
                </div>
              </div>
              {(step.resources || []).length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {step.resources.map((resource) => (
                    <span
                      key={resource}
                      className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600"
                    >
                      {resource}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-8 text-sm italic leading-7 text-slate-500">{content.closing_note}</p>

      <button
        className="mt-8 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-brand-300 hover:text-brand-700"
        onClick={onRestart}
        type="button"
      >
        Start over
      </button>
    </motion.section>
  );
}
