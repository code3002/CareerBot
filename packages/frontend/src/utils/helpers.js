function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createUserEntry(message) {
  return {
    id: createId(),
    role: "user",
    timestamp: Date.now(),
    content: {
      type: "message",
      message
    }
  };
}

export function createAssistantEntry(content) {
  const normalized = normalizeAssistantContent(content);

  return {
    id: createId(),
    role: "assistant",
    timestamp: Date.now(),
    content: normalized
  };
}

function extractJsonCandidate(rawText) {
  const trimmed = String(rawText || "").trim();

  if (!trimmed) {
    return "";
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);

  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1).trim();
  }

  return trimmed;
}

function parseStructuredMessage(message) {
  const candidate = extractJsonCandidate(message);

  if (!candidate || !candidate.startsWith("{")) {
    return null;
  }

  try {
    const parsed = JSON.parse(candidate);

    if (parsed && typeof parsed === "object" && typeof parsed.type === "string") {
      return parsed;
    }
  } catch (error) {
    return null;
  }

  return null;
}

export function normalizeAssistantContent(content) {
  if (!content || typeof content !== "object") {
    return {
      type: "message",
      message: ""
    };
  }

  if (
    content.type === "path_cards" &&
    Array.isArray(content.paths) &&
    content.paths.length > 0
  ) {
    return content;
  }

  if (content.type === "action_plan" && Array.isArray(content.steps)) {
    return content;
  }

  if (typeof content.message === "string") {
    const parsed = parseStructuredMessage(content.message);

    if (parsed) {
      return parsed;
    }
  }

  return content;
}

export function getDisplayText(content) {
  if (!content) {
    return "";
  }

  return content.message || "";
}

export function isTerminalResponse(content) {
  return content?.type === "action_plan" || content?.type === "closing";
}

export function getProgressStage(meta, messages) {
  const stage = meta?.stage;

  if (stage === "planning") {
    return 4;
  }

  if (stage === "paths") {
    return 3;
  }

  if (stage === "clarifying") {
    return 2;
  }

  if (messages.length > 0) {
    return 1;
  }

  return 0;
}

export function buildExportText(snapshot, messages, selectedPath) {
  const lines = ["Leap Career Bot Session", ""];

  if (snapshot) {
    lines.push(`Persona: ${snapshot.persona}`);
    lines.push(`Experience: ${snapshot.experience_estimate}`);
    lines.push(`Market positioning: ${snapshot.market_positioning}`);
    lines.push("");
  }

  if (selectedPath?.title) {
    lines.push(`Selected path: ${selectedPath.title}`);
    lines.push("");
  }

  messages.forEach((entry) => {
    const label = entry.role === "user" ? "User" : "Coach";
    const content = entry.content;

    if (content.type === "path_cards") {
      lines.push(`${label}: ${content.message}`);
      content.paths.forEach((path, index) => {
        lines.push(`${index + 1}. ${path.title} (${path.timeline}, ${path.salary_range})`);
      });
    } else if (content.type === "action_plan") {
      lines.push(`${label}: ${content.message}`);
      content.steps.forEach((step) => {
        lines.push(`Week ${step.week}: ${step.action}`);
      });
    } else {
      lines.push(`${label}: ${getDisplayText(content)}`);
    }

    lines.push("");
  });

  return lines.join("\n");
}

export function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function saveSessionHistory(session) {
  try {
    const existing = JSON.parse(localStorage.getItem("leap-career-history") || "[]");
    const next = [session, ...existing.filter((entry) => entry.id !== session.id)].slice(0, 6);
    localStorage.setItem("leap-career-history", JSON.stringify(next));
  } catch (error) {
    return null;
  }

  return null;
}

export function loadSessionHistory() {
  try {
    return JSON.parse(localStorage.getItem("leap-career-history") || "[]");
  } catch (error) {
    return [];
  }
}

export function formatTime(timestamp) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit"
  }).format(timestamp);
}
