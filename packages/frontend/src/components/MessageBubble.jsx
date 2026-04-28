import { motion } from "framer-motion";

export default function MessageBubble({ message, role, timestamp }) {
  const isUser = role === "user";

  return (
    <motion.div
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <div
        className={`max-w-2xl rounded-[24px] px-5 py-4 shadow-sm ${
          isUser
            ? "bg-brand-600 text-white"
            : "border border-slate-200 bg-white text-slate-700"
        }`}
      >
        <p className="whitespace-pre-wrap text-[15px] leading-7">{message}</p>
        <p
          className={`mt-3 text-xs ${
            isUser ? "text-brand-100" : "text-slate-400"
          }`}
        >
          {timestamp}
        </p>
      </div>
    </motion.div>
  );
}
