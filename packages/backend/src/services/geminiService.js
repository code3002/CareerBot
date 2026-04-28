const OpenAI = require("openai");

const { buildSystemPrompt, buildScorecardPrompt } = require("../utils/promptBuilder");

const MODEL_CANDIDATES = ["gpt-4o", "gpt-4o-mini"];

function extractJsonCandidate(rawText) {
  const trimmed = String(rawText || "").trim();
  if (!trimmed) return "";

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch) return fencedMatch[1].trim();

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1).trim();
  }

  return trimmed;
}

function parseModelResponse(rawText) {
  const candidate = extractJsonCandidate(rawText);
  if (!candidate) {
    return { type: "message", message: "I ran into trouble formatting that response. Please try again." };
  }
  try {
    return JSON.parse(candidate);
  } catch {
    return {
      type: "message",
      message: String(rawText || candidate).trim() || "I ran into trouble formatting that response. Please try again."
    };
  }
}

function createClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY environment variable.");
  return new OpenAI({ apiKey });
}

function buildMessages(systemPrompt, conversationHistory, userMessage) {
  const messages = [{ role: "system", content: systemPrompt }];

  for (const entry of conversationHistory) {
    messages.push({
      role: entry.role === "assistant" ? "assistant" : "user",
      content: String(entry.content ?? "")
    });
  }

  messages.push({ role: "user", content: userMessage });
  return messages;
}

function isRetryableError(error) {
  const status = error?.status;
  const message = error?.message || "";
  return (
    status === 429 ||
    status === 503 ||
    message.includes("rate_limit") ||
    message.includes("overloaded") ||
    message.includes("RESOURCE_EXHAUSTED")
  );
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateResponse(profileText, conversationHistory, userMessage, options = {}) {
  const openai = createClient();
  const systemPrompt = buildSystemPrompt(profileText, options);
  const messages = buildMessages(systemPrompt, conversationHistory, userMessage);
  let lastError;

  for (const model of MODEL_CANDIDATES) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await openai.chat.completions.create({
          model,
          messages,
          max_tokens: 4096,
          response_format: { type: "json_object" }
        });

        const rawText = (response.choices[0]?.message?.content || "").trim();
        return parseModelResponse(rawText);
      } catch (error) {
        lastError = error;
        if (!isRetryableError(error)) throw error;
        if (attempt === 0) await wait(600);
      }
    }
  }

  const msg = lastError?.message || "";
  if (msg.includes("rate_limit") || (lastError?.status === 429)) {
    const e = new Error("The AI coach is temporarily rate-limited. Please wait a moment and try again.");
    e.statusCode = 429;
    throw e;
  }

  throw lastError;
}

async function generateScorecard(profileText, sourceType = "resume") {
  const openai = createClient();
  const prompt = buildScorecardPrompt(profileText, sourceType);
  let lastError;

  for (const model of MODEL_CANDIDATES) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await openai.chat.completions.create({
          model,
          messages: [
            {
              role: "system",
              content: "You are an expert career coach reviewing a resume. Return only valid JSON with no markdown and no prose outside the JSON object."
            },
            { role: "user", content: prompt }
          ],
          max_tokens: 1024,
          response_format: { type: "json_object" }
        });

        const rawText = (response.choices[0]?.message?.content || "").trim();
        return parseModelResponse(rawText);
      } catch (error) {
        lastError = error;
        if (!isRetryableError(error)) throw error;
        if (attempt === 0) await wait(600);
      }
    }
  }

  throw lastError;
}

async function* generateStreamResponse(profileText, conversationHistory, userMessage, options = {}) {
  const openai = createClient();
  const systemPrompt = buildSystemPrompt(profileText, options);
  const messages = buildMessages(systemPrompt, conversationHistory, userMessage);
  let lastError;

  for (const model of MODEL_CANDIDATES) {
    let stream = null;

    // Phase 1: acquire the stream — retry up to 2 times per model
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        stream = await openai.chat.completions.create({
          model,
          messages,
          max_tokens: 4096,
          response_format: { type: "json_object" },
          stream: true
        });
        break;
      } catch (error) {
        lastError = error;
        if (!isRetryableError(error)) throw error;
        if (attempt === 0) await wait(600);
      }
    }

    if (!stream) continue;

    // Phase 2: read chunks — no retry once streaming has started
    let accumulated = "";
    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content || "";
      if (token) {
        accumulated += token;
        yield { token, accumulated, done: false };
      }
    }

    const parsed = parseModelResponse(accumulated);
    yield { token: "", accumulated, done: true, parsed };
    return;
  }

  throw lastError || new Error("All models failed to start a streaming response.");
}

module.exports = {
  generateResponse,
  generateScorecard,
  generateStreamResponse
};
