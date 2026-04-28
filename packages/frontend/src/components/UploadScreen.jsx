import { useState } from "react";
import { motion } from "framer-motion";
import { useDropzone } from "react-dropzone";

export default function UploadScreen({
  error,
  history,
  isLoading,
  onOpenHistory,
  onUpload
}) {
  const [inputMode, setInputMode] = useState("resume");
  const [selectedFile, setSelectedFile] = useState(null);
  const [profileText, setProfileText] = useState("");

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "application/pdf": [".pdf"]
    },
    maxFiles: 1,
    disabled: isLoading,
    onDrop: (acceptedFiles) => {
      setSelectedFile(acceptedFiles[0] || null);
    }
  });

  async function handleSubmit() {
    if (isLoading) {
      return;
    }

    if (inputMode === "resume") {
      if (!selectedFile) {
        return;
      }

      await onUpload({
        mode: "resume",
        file: selectedFile
      });
      return;
    }

    if (!profileText.trim()) {
      return;
    }

    await onUpload({
      mode: "linkedin",
      profileText
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.section
          className="rounded-[32px] border border-white/60 bg-white/70 p-8 shadow-soft backdrop-blur xl:p-12"
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <div className="mb-8 inline-flex items-center gap-3 rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white">
              L
            </span>
            Leap Career Bot
          </div>

          <div className="space-y-5">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-600">
              Resume to Direction
            </p>
            <h1 className="max-w-xl text-4xl font-semibold leading-tight text-ink sm:text-5xl">
              Find the next career path that actually fits your background.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-slate-600">
              Upload your resume and get a focused coaching conversation, three concrete
              career directions, and a 4-week action plan you can start this week.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              "AI reads your resume and spots the real tension.",
              "You get sharp, targeted follow-ups instead of generic advice.",
              "Choose a path and walk away with a practical 4-week plan."
            ].map((item, index) => (
              <motion.div
                key={item}
                className="rounded-3xl bg-slate-50 p-4 text-sm leading-6 text-slate-600"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.08 }}
              >
                {item}
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section
          className="rounded-[32px] bg-ink p-6 text-white shadow-float sm:p-8"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-brand-200">
                Start here
              </p>
              <h2 className="mt-3 text-2xl font-semibold">
                {inputMode === "resume" ? "Upload your resume PDF" : "Paste LinkedIn or profile text"}
              </h2>
            </div>
            <div className="rounded-full border border-white/15 px-3 py-2 text-xs text-slate-300">
              {inputMode === "resume" ? "Max 5MB" : "Text input"}
            </div>
          </div>

          <div className="mb-5 inline-flex rounded-full border border-white/10 bg-white/5 p-1 text-sm">
            {[
              { id: "resume", label: "Resume PDF" },
              { id: "linkedin", label: "LinkedIn / profile text" }
            ].map((mode) => (
              <button
                key={mode.id}
                className={`rounded-full px-4 py-2 transition ${
                  inputMode === mode.id ? "bg-white text-ink" : "text-slate-300"
                }`}
                onClick={() => setInputMode(mode.id)}
                type="button"
              >
                {mode.label}
              </button>
            ))}
          </div>

          {inputMode === "resume" ? (
            <div
              {...getRootProps()}
              className={`cursor-pointer rounded-[28px] border border-dashed p-8 text-center transition ${
                isDragActive
                  ? "border-brand-300 bg-brand-500/15"
                  : "border-white/15 bg-white/5 hover:border-brand-300/70 hover:bg-white/10"
              }`}
            >
              <input {...getInputProps()} />
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-2xl">
                PDF
              </div>
              <p className="text-lg font-medium">
                {selectedFile ? selectedFile.name : "Drag and drop your resume here"}
              </p>
              <p className="mt-3 text-sm text-slate-300">
                {selectedFile ? "Ready to analyze." : "or click to browse for a PDF file"}
              </p>
            </div>
          ) : (
            <textarea
              className="min-h-[240px] w-full rounded-[28px] border border-white/15 bg-white/5 px-5 py-4 text-sm leading-7 text-white outline-none transition placeholder:text-slate-400 focus:border-brand-300"
              onChange={(event) => setProfileText(event.target.value)}
              placeholder="Paste your LinkedIn About section, experience summary, or full profile text here..."
              value={profileText}
            />
          )}

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-300/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          <button
            className="mt-6 w-full rounded-2xl bg-brand-600 px-5 py-4 text-base font-semibold text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-brand-900/60"
            disabled={
              isLoading ||
              (inputMode === "resume" ? !selectedFile : !profileText.trim())
            }
            onClick={handleSubmit}
            type="button"
          >
            {isLoading
              ? "Analyzing your profile..."
              : inputMode === "resume"
                ? "Analyze my resume"
                : "Analyze my LinkedIn profile"}
          </button>

          {history.length ? (
            <button
              className="mt-3 w-full rounded-2xl border border-white/15 px-5 py-4 text-sm font-medium text-slate-200 transition hover:border-brand-300 hover:text-white"
              onClick={onOpenHistory}
              type="button"
            >
              Continue a previous session
            </button>
          ) : null}

          <p className="mt-4 text-center text-xs uppercase tracking-[0.2em] text-slate-400">
            Profile text stays on the backend. The frontend keeps your session ID and recent session history.
          </p>
        </motion.section>
      </div>
    </div>
  );
}
