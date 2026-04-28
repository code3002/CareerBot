import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import ActionPlan from "./ActionPlan";
import CareerSnapshot from "./CareerSnapshot";
import MessageBubble from "./MessageBubble";
import PathCardDeck from "./PathCardDeck";
import ProgressTracker from "./ProgressTracker";
import ScorecardPanel from "./ScorecardPanel";
import {
  buildExportText,
  downloadTextFile,
  formatTime,
  getDisplayText
} from "../utils/helpers";

function StreamingBubble({ text }) {
  return (
    <motion.div
      className="flex justify-start"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="max-w-2xl rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
        {text ? (
          <p className="whitespace-pre-wrap text-[15px] leading-7 text-slate-700">
            {text}
            <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-brand-400 align-middle" />
          </p>
        ) : (
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((dot) => (
              <motion.span
                key={dot}
                className="h-2.5 w-2.5 rounded-full bg-brand-400"
                animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
                transition={{ repeat: Infinity, duration: 1, delay: dot * 0.12 }}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function ChatWindow({
  chatError,
  isComplete,
  isSending,
  messages,
  meta,
  onRejectPaths,
  onRejectReason,
  onRestart,
  onSelectPath,
  onSendMessage,
  pathRound,
  scorecard,
  scorecardLoading,
  selectedPath,
  snapshot,
  streamingText
}) {
  const [draft, setDraft] = useState("");
  const scrollAnchorRef = useRef(null);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending]);

  function handleSubmit(event) {
    event.preventDefault();

    if (!draft.trim() || isSending || isComplete) {
      return;
    }

    onSendMessage(draft);
    setDraft("");
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-4 sm:px-6 sm:py-6">
      <header className="sticky top-0 z-10 mb-4 rounded-[28px] border border-white/60 bg-white/85 px-5 py-4 shadow-soft backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-600 text-lg font-semibold text-white shadow-lg shadow-brand-600/30">
              L
            </div>
            <div>
              <h1 className="text-lg font-semibold text-ink">Career Coach</h1>
              <p className="text-sm text-slate-500">
                Focused guidance, path cards, and a plan you can act on.
              </p>
            </div>
          </div>

          <button
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-brand-200 hover:text-brand-700"
            onClick={onRestart}
            type="button"
          >
            Start over
          </button>
        </div>
      </header>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[32px] border border-white/60 bg-white/80 shadow-soft backdrop-blur">
        <div className="border-b border-slate-200/80 bg-slate-50/70 px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-4">
            <ProgressTracker currentStage={meta.progressStage} />
            <div className="flex flex-wrap gap-3">
              <button
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-brand-300 hover:text-brand-700"
                onClick={() =>
                  downloadTextFile(
                    "leap-career-session.txt",
                    buildExportText(snapshot, messages, selectedPath)
                  )
                }
                type="button"
              >
                Export session
              </button>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <div className="space-y-5">
            <CareerSnapshot snapshot={snapshot} />
            <ScorecardPanel scorecard={scorecard} isLoading={scorecardLoading} />

            {(() => {
              let pathRoundCounter = 0;
              const pathCardRoundMap = new Map();
              messages.forEach((entry) => {
                if (entry.role === "assistant" && entry.content?.type === "path_cards") {
                  pathRoundCounter++;
                  pathCardRoundMap.set(entry.id, pathRoundCounter);
                }
              });
              const latestPathCardRound = pathRoundCounter;

              return messages.map((entry) => {
                const content = entry.content;

                if (entry.role === "assistant" && content.type === "path_cards") {
                  const ownRound = pathCardRoundMap.get(entry.id);
                  const isActive = ownRound === latestPathCardRound && !selectedPath;
                  return (
                    <PathCardDeck
                      key={entry.id}
                      intro={content.message}
                      isActive={isActive}
                      onReject={isActive ? onRejectPaths : null}
                      onRejectReason={isActive ? onRejectReason : null}
                      onSelect={isActive ? onSelectPath : null}
                      ownRound={ownRound}
                      paths={content.paths}
                      selectedPath={selectedPath}
                    />
                  );
                }

                if (entry.role === "assistant" && content.type === "action_plan") {
                  return (
                    <ActionPlan
                      key={entry.id}
                      content={content}
                      onRestart={onRestart}
                    />
                  );
                }

                if (entry.role === "assistant" && content.type === "closing") {
                  return (
                    <motion.div
                      key={entry.id}
                      className="rounded-[28px] border border-amber-200 bg-amber-50 px-6 py-5 shadow-sm"
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35 }}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">
                        End of path exploration
                      </p>
                      <p className="mt-3 text-[15px] leading-7 text-slate-700">{content.message}</p>
                      <button
                        className="mt-4 rounded-2xl border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-100"
                        onClick={onRestart}
                        type="button"
                      >
                        Start fresh with a new resume
                      </button>
                    </motion.div>
                  );
                }

                return (
                  <MessageBubble
                    key={entry.id}
                    message={getDisplayText(content)}
                    role={entry.role}
                    timestamp={formatTime(entry.timestamp)}
                  />
                );
              });
            })()}

            <AnimatePresence>
              {isSending ? <StreamingBubble text={streamingText} /> : null}
            </AnimatePresence>

            {chatError ? (
              <motion.div
                className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {chatError}
              </motion.div>
            ) : null}

            <div ref={scrollAnchorRef} />
          </div>
        </div>

        <div className="border-t border-slate-200/80 bg-slate-50/80 px-4 py-4 sm:px-6">
          {isComplete ? (
            <div className="rounded-2xl border border-brand-100 bg-white px-4 py-4 text-sm text-slate-600">
              This thread has reached a stopping point. You can start over with a new
              resume whenever you want a different direction.
            </div>
          ) : (
            <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleSubmit}>
              <input
                className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-ink outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
                disabled={isSending}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Answer the coach, ask for clarity, or respond to the path options..."
                value={draft}
              />
              <button
                className="rounded-2xl bg-brand-600 px-5 py-4 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-brand-300"
                disabled={isSending || !draft.trim()}
                type="submit"
              >
                Send
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
