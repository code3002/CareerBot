import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001",
  timeout: 90000
});

function formatError(error, fallbackMessage) {
  if (axios.isAxiosError(error)) {
    return {
      error: error.response?.data?.error || error.message || fallbackMessage
    };
  }

  return {
    error: fallbackMessage
  };
}

export async function uploadResume(file) {
  const formData = new FormData();
  formData.append("resume", file);

  try {
    const response = await apiClient.post("/api/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    });

    return {
      sessionId: response.data.sessionId,
      snapshot: response.data.snapshot
    };
  } catch (error) {
    return formatError(error, "We could not upload your resume.");
  }
}

export async function createProfileSession(profileText, sourceType = "linkedin") {
  try {
    const response = await apiClient.post("/api/profile", {
      profileText,
      sourceType
    });

    return {
      sessionId: response.data.sessionId,
      snapshot: response.data.snapshot
    };
  } catch (error) {
    return formatError(error, "We could not create a session from that profile.");
  }
}

export async function sendMessage(sessionId, message) {
  try {
    const response = await apiClient.post("/api/chat", {
      sessionId,
      message
    });

    return response.data;
  } catch (error) {
    return formatError(error, "We could not reach the career coach.");
  }
}

export async function fetchScorecard(sessionId) {
  try {
    const response = await apiClient.get(`/api/score/${sessionId}`);
    return { scorecard: response.data.scorecard };
  } catch (error) {
    return formatError(error, "Could not generate scorecard.");
  }
}

export async function sendMessageStream(sessionId, message, onToken, onDone, onError) {
  const baseURL = import.meta.env.VITE_API_URL || "http://localhost:3001";

  try {
    const response = await fetch(`${baseURL}/api/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, message }),
      signal: AbortSignal.timeout(90000)
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      onError(body.error || "The career coach returned an error.");
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (!raw) continue;

        try {
          const event = JSON.parse(raw);
          if (event.done) {
            if (event.error) {
              onError(event.error);
            } else {
              onDone(event.response, event.meta);
            }
          } else if (event.token) {
            onToken(event.token, event.accumulated);
          }
        } catch {
          // partial line — ignore
        }
      }
    }
  } catch (error) {
    onError(error.message || "Stream connection failed.");
  }
}
