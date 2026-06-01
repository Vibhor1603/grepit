import * as Sentry from "@sentry/nextjs";
import { getChatModel, getChatModelChain } from "./ai-models";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions";

export function getAIApiUrl() {
  return OPENROUTER_BASE_URL;
}

export function getAIHeaders() {
  return {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://grepit.co",
    "X-Title": "grepit Code Analyst",
  };
}

/** Primary chat model id (first entry in OPENROUTER_CHAT_MODELS). */
export function getAIModel() {
  return getChatModel();
}

/** Ordered model ids for OpenRouter fallback routing. */
export function getAIModelChain() {
  return getChatModelChain();
}

export async function aiFetch(body, maxAttempts = 2) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("No AI provider configured (OPENROUTER_API_KEY missing)");
  }

  const models = getChatModelChain();
  let lastError;

  const requestBody = {
    ...body,
    models,
    route: "fallback",
  };

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);
      const res = await fetch(OPENROUTER_BASE_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://grepit.co",
          "X-Title": "grepit Code Analyst",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.status === 429 && attempt < maxAttempts - 1) {
        console.warn("[ai] rate limited, retrying...");
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      if (res.status === 402) {
        const err = new Error("AI provider credits exhausted");
        Sentry.captureException(err, {
          level: "fatal",
          tags: { source: "ai-provider", reason: "credits_exhausted" },
        });
        console.error("[ai] CRITICAL: AI provider credits exhausted!");
        throw err;
      }

      return res;
    } catch (err) {
      lastError = err;
      if (err.name === "AbortError") {
        console.error(`[ai] request timed out (attempt ${attempt + 1})`);
        if (attempt < maxAttempts - 1) {
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
      } else if (err.message === "AI provider credits exhausted") {
        throw err;
      } else if (attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  const finalError = lastError || new Error("AI provider failed after retries");
  Sentry.captureException(finalError, {
    level: "error",
    tags: { source: "ai-provider", reason: "all_attempts_failed" },
  });
  throw finalError;
}

export function buildReasoningRequest({
  messages,
  maxCompletionTokens = 3000,
  temperature = 0.2,
}) {
  return {
    model: getChatModel(),
    messages,
    temperature,
    top_p: 1,
    max_tokens: maxCompletionTokens,
    stream: false,
  };
}

export function buildStructuredRequest({
  messages,
  maxCompletionTokens = 2500,
  temperature = 0.1,
}) {
  return {
    model: getChatModel(),
    messages,
    temperature,
    top_p: 1,
    max_tokens: maxCompletionTokens,
    stream: false,
    response_format: {
      type: "json_object",
    },
  };
}
