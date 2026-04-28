import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import ChatWindow from "./components/ChatWindow";
import SessionHistoryModal from "./components/SessionHistoryModal";
import UploadScreen from "./components/UploadScreen";
import { createProfileSession, fetchScorecard, sendMessageStream, uploadResume } from "./services/api";
import {
  getProgressStage,
  createAssistantEntry,
  createUserEntry,
  isTerminalResponse,
  loadSessionHistory,
  saveSessionHistory
} from "./utils/helpers";

const INITIAL_STATE = {
  screen: "upload",
  sessionId: "",
  resumeText: "",
  conversationHistory: [],
  sourceType: "resume",
  messages: [],
  pathRound: 0,
  selectedPath: null,
  snapshot: null,
  meta: {
    stage: "analyzed",
    progressStage: 0,
    preferenceSignals: {}
  }
};

function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function extractStreamingMessage(accumulated) {
  const typeMatch = accumulated.match(/"type"\s*:\s*"([^"]+)"/);
  if (!typeMatch || typeMatch[1] !== "message") return "";
  const msgMatch = accumulated.match(/"message"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
  if (!msgMatch) return "";
  return msgMatch[1]
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

export default function App() {
  const [screen, setScreen] = useState(INITIAL_STATE.screen);
  const [sessionId, setSessionId] = useState(INITIAL_STATE.sessionId);
  const [resumeText, setResumeText] = useState(INITIAL_STATE.resumeText);
  const [conversationHistory, setConversationHistory] = useState(INITIAL_STATE.conversationHistory);
  const [sourceType, setSourceType] = useState(INITIAL_STATE.sourceType);
  const [messages, setMessages] = useState(INITIAL_STATE.messages);
  const [pathRound, setPathRound] = useState(INITIAL_STATE.pathRound);
  const [selectedPath, setSelectedPath] = useState(INITIAL_STATE.selectedPath);
  const [snapshot, setSnapshot] = useState(INITIAL_STATE.snapshot);
  const [meta, setMeta] = useState(INITIAL_STATE.meta);
  const [uploadError, setUploadError] = useState("");
  const [chatError, setChatError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [scorecard, setScorecard] = useState(null);
  const [scorecardLoading, setScorecardLoading] = useState(false);
  const [sessionHistory, setSessionHistory] = useState(loadSessionHistory());
  const [showHistory, setShowHistory] = useState(false);

  async function handleUpload(payload) {
    setIsUploading(true);
    setUploadError("");
    setChatError("");

    const sType = payload.mode === "linkedin" ? "linkedin" : "resume";
    const result =
      payload.mode === "linkedin"
        ? await createProfileSession(payload.profileText, sType)
        : await uploadResume(payload.file);

    if (result.error) {
      setUploadError(result.error);
      setIsUploading(false);
      return;
    }

    const sid = generateId();
    const rText = result.resumeText;
    const snap = result.snapshot || null;

    setResumeText(rText);
    setSourceType(sType);
    setConversationHistory([]);
    setSnapshot(snap);
    setSessionId(sid);
    setScreen("loading");

    setScorecardLoading(true);
    fetchScorecard(rText, sType).then((sc) => {
      if (!sc.error) setScorecard(sc.scorecard);
      setScorecardLoading(false);
    });

    const context = {
      resumeText: rText,
      conversationHistory: [],
      sourceType: sType,
      snapshot: snap,
      pathRound: 0,
      selectedPath: null,
      preferenceSignals: {}
    };

    let openingResult = null;
    let openingError = null;
    let nextHistory = [];

    await new Promise((resolve) => {
      sendMessageStream(
        context,
        "hello",
        (_token, accumulated) => {
          setStreamingText(extractStreamingMessage(accumulated));
        },
        (parsed, _meta, history) => {
          openingResult = { ...parsed, meta: _meta };
          nextHistory = history;
          resolve();
        },
        (err) => {
          openingError = err;
          resolve();
        }
      );
    });

    setStreamingText("");

    if (openingError || !openingResult) {
      setUploadError(openingError || "Could not start the coaching session.");
      setScreen("upload");
      setIsUploading(false);
      return;
    }

    const nextMessages = [createAssistantEntry(openingResult)];
    const nextMeta = {
      ...(openingResult.meta || {}),
      preferenceSignals: openingResult.meta?.preferenceSignals || {},
      progressStage: getProgressStage(openingResult.meta, nextMessages)
    };

    setConversationHistory(nextHistory);
    setMessages(nextMessages);
    setMeta(nextMeta);
    setPathRound(openingResult.meta?.pathRound || 0);
    setScreen(isTerminalResponse(openingResult) ? "complete" : "chat");
    persistSession({
      id: sid,
      resumeText: rText,
      sourceType: sType,
      conversationHistory: nextHistory,
      snapshot: snap,
      messages: nextMessages,
      pathRound: 0,
      selectedPath: null,
      meta: nextMeta
    });
    setIsUploading(false);
  }

  function persistSession(nextSession) {
    const entry = {
      ...nextSession,
      savedAt: Date.now(),
      savedAtLabel: new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit"
      }).format(Date.now())
    };

    saveSessionHistory(entry);
    setSessionHistory(loadSessionHistory());
  }

  async function handleSendMessage(nextMessage) {
    if (!nextMessage.trim() || !resumeText || isSending) return;

    setChatError("");
    setIsSending(true);
    setStreamingText("");

    const userEntry = createUserEntry(nextMessage);
    const messagesBeforeSend = messages;
    setMessages((current) => [...current, userEntry]);

    const context = {
      resumeText,
      conversationHistory,
      sourceType,
      snapshot,
      pathRound,
      selectedPath,
      preferenceSignals: meta.preferenceSignals || {}
    };

    await new Promise((resolve) => {
      sendMessageStream(
        context,
        nextMessage,
        (_token, accumulated) => {
          setStreamingText(extractStreamingMessage(accumulated));
        },
        (response, responseMeta, nextHistory) => {
          setStreamingText("");

          if (response.type === "path_cards") setPathRound((current) => current + 1);
          if (response.type === "action_plan") setSelectedPath({ title: response.selected_path });

          const fullResponse = { ...response, meta: responseMeta };
          const assistantEntry = createAssistantEntry(fullResponse);
          const nextMessages = [...messagesBeforeSend, userEntry, assistantEntry];
          const nextMeta = {
            ...(responseMeta || meta),
            preferenceSignals: responseMeta?.preferenceSignals || meta.preferenceSignals || {},
            progressStage: getProgressStage(responseMeta || meta, nextMessages)
          };

          setConversationHistory(nextHistory);
          setMessages(nextMessages);
          setMeta(nextMeta);
          setPathRound(responseMeta?.pathRound ?? pathRound);
          setSnapshot((responseMeta && responseMeta.snapshot) || snapshot);
          setScreen(isTerminalResponse(response) ? "complete" : "chat");
          persistSession({
            id: sessionId,
            resumeText,
            sourceType,
            conversationHistory: nextHistory,
            snapshot: (responseMeta && responseMeta.snapshot) || snapshot,
            messages: nextMessages,
            pathRound: responseMeta?.pathRound ?? pathRound,
            selectedPath:
              response.type === "action_plan" ? { title: response.selected_path } : selectedPath,
            meta: nextMeta
          });
          setIsSending(false);
          resolve();
        },
        (err) => {
          setStreamingText("");
          setChatError(err);
          setMessages((current) => current.slice(0, -1));
          setIsSending(false);
          resolve();
        }
      );
    });
  }

  function handlePathSelect(path) {
    setSelectedPath(path);
    handleSendMessage(`I like ${path.title}. This is my path.`);
  }

  function handlePathReject() {
    const rejectionMessage =
      pathRound === 1
        ? "None of these feel right."
        : pathRound === 2
          ? "These still do not feel right. Try a final angle."
          : "These paths still do not fit.";
    handleSendMessage(rejectionMessage);
  }

  function handlePathRejectReason(reason) {
    handleSendMessage(
      `None of these feel right. The main mismatch is ${reason}. Please generate three better options based on that.`
    );
  }

  function handleResumeSession(entry) {
    if (!entry.resumeText) {
      setUploadError("This session cannot be resumed. Please upload your resume again.");
      setShowHistory(false);
      return;
    }

    setSessionId(entry.id);
    setResumeText(entry.resumeText);
    setSourceType(entry.sourceType || "resume");
    setConversationHistory(entry.conversationHistory || []);
    setSnapshot(entry.snapshot || null);
    setMessages(entry.messages || []);
    setPathRound(entry.pathRound || 0);
    setSelectedPath(entry.selectedPath || null);
    setMeta(entry.meta || INITIAL_STATE.meta);
    setScreen("chat");
    setShowHistory(false);
    setUploadError("");
    setChatError("");
  }

  function handleRestart() {
    setScreen(INITIAL_STATE.screen);
    setSessionId(INITIAL_STATE.sessionId);
    setResumeText(INITIAL_STATE.resumeText);
    setConversationHistory(INITIAL_STATE.conversationHistory);
    setSourceType(INITIAL_STATE.sourceType);
    setMessages(INITIAL_STATE.messages);
    setPathRound(INITIAL_STATE.pathRound);
    setSelectedPath(INITIAL_STATE.selectedPath);
    setSnapshot(INITIAL_STATE.snapshot);
    setMeta(INITIAL_STATE.meta);
    setUploadError("");
    setChatError("");
    setIsUploading(false);
    setIsSending(false);
    setStreamingText("");
    setScorecard(null);
    setScorecardLoading(false);
  }

  return (
    <main className="min-h-screen bg-sand bg-hero-grid text-ink">
      <AnimatePresence mode="wait">
        {screen === "upload" || screen === "loading" ? (
          <motion.div
            key={screen}
            className="min-h-screen"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <UploadScreen
              error={uploadError}
              history={sessionHistory}
              isLoading={isUploading || screen === "loading"}
              onOpenHistory={() => setShowHistory(true)}
              onUpload={handleUpload}
            />
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            className="min-h-screen"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <ChatWindow
              chatError={chatError}
              isComplete={screen === "complete"}
              isSending={isSending}
              messages={messages}
              meta={meta}
              onRejectPaths={handlePathReject}
              onRejectReason={handlePathRejectReason}
              onRestart={handleRestart}
              onSelectPath={handlePathSelect}
              onSendMessage={handleSendMessage}
              pathRound={pathRound}
              scorecard={scorecard}
              scorecardLoading={scorecardLoading}
              selectedPath={selectedPath}
              snapshot={snapshot}
              streamingText={streamingText}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {showHistory ? (
        <SessionHistoryModal
          history={sessionHistory}
          onClose={() => setShowHistory(false)}
          onSelect={handleResumeSession}
        />
      ) : null}
    </main>
  );
}
