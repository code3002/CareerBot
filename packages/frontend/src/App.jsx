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
  messages: [],
  pathRound: 0,
  selectedPath: null,
  snapshot: null,
  meta: {
    stage: "analyzed",
    progressStage: 0
  }
};

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

    const result =
      payload.mode === "linkedin"
        ? await createProfileSession(payload.profileText, "linkedin")
        : await uploadResume(payload.file);

    if (result.error) {
      setUploadError(result.error);
      setIsUploading(false);
      return;
    }

    const sid = result.sessionId;
    setSnapshot(result.snapshot || null);
    setSessionId(sid);
    setScreen("loading");

    // Start scorecard fetch in the background immediately
    setScorecardLoading(true);
    fetchScorecard(sid).then((sc) => {
      if (!sc.error) setScorecard(sc.scorecard);
      setScorecardLoading(false);
    });

    // Get the opening coach message via streaming
    let openingResult = null;
    let openingError = null;
    let openingAccumulated = "";

    await new Promise((resolve) => {
      sendMessageStream(
        sid,
        "hello",
        (_token, accumulated) => {
          openingAccumulated = accumulated;
          setStreamingText(extractStreamingMessage(accumulated));
        },
        (parsed, _meta) => {
          openingResult = { ...parsed, meta: _meta };
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
      progressStage: getProgressStage(openingResult.meta, nextMessages)
    };

    setMessages(nextMessages);
    setMeta(nextMeta);
    setPathRound(openingResult.meta?.pathRound || 0);
    setScreen(isTerminalResponse(openingResult) ? "complete" : "chat");
    persistSession({
      id: sid,
      snapshot: result.snapshot,
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
    if (!nextMessage.trim() || !sessionId || isSending) {
      return;
    }

    setChatError("");
    setIsSending(true);
    setStreamingText("");

    const userEntry = createUserEntry(nextMessage);
    const messagesBeforeSend = messages;
    setMessages((current) => [...current, userEntry]);

    await new Promise((resolve) => {
      sendMessageStream(
        sessionId,
        nextMessage,
        (_token, accumulated) => {
          setStreamingText(extractStreamingMessage(accumulated));
        },
        (response, responseMeta) => {
          setStreamingText("");

          if (response.type === "path_cards") {
            setPathRound((current) => current + 1);
          }
          if (response.type === "action_plan") {
            setSelectedPath({ title: response.selected_path });
          }

          const fullResponse = { ...response, meta: responseMeta };
          const assistantEntry = createAssistantEntry(fullResponse);
          const nextMessages = [...messagesBeforeSend, userEntry, assistantEntry];
          const nextMeta = {
            ...(responseMeta || meta),
            progressStage: getProgressStage(responseMeta || meta, nextMessages)
          };

          setMessages(nextMessages);
          setMeta(nextMeta);
          setPathRound(responseMeta?.pathRound ?? pathRound);
          setSnapshot((responseMeta && responseMeta.snapshot) || snapshot);
          setScreen(isTerminalResponse(response) ? "complete" : "chat");
          persistSession({
            id: sessionId,
            snapshot: (responseMeta && responseMeta.snapshot) || snapshot,
            messages: nextMessages,
            pathRound: responseMeta?.pathRound ?? pathRound,
            selectedPath:
              response.type === "action_plan"
                ? { title: response.selected_path }
                : selectedPath,
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
    setSessionId(entry.id);
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
