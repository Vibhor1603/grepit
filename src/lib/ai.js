import * as Sentry from "@sentry/nextjs";

// ── AI Provider abstraction ──
// Primary: OpenRouter (configured chat model) — 1M context, cheap, fast
// Fallback: Groq (llama-3.1-8b-instant) — free tier

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions";

// Primary model via OpenRouter
const OPENROUTER_MODEL = "REDACTED_CHAT_MODEL";

// Fallback models (same quality/context tier, same or cheaper cost)
// OpenRouter handles fallback automatically with route="fallback"
const FALLBACK_MODELS = [
  "REDACTED_CHAT_MODEL",       // Primary: 1M context, $0.20/MTok input
  "REDACTED_CHAT_MODEL",       // Fallback 1: 1M context, $0.10/MTok input
  "qwen/qwen-3-235b-a22b",            // Fallback 2: 128K context, excellent at code
  "REDACTED_CHAT_MODEL",            // Fallback 3: 128K context, $0.14/MTok input
];

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

export function getAIModel() {
  return OPENROUTER_MODEL;
}

// ── Fetch with OpenRouter provider fallback ─────────────────────────────────────
export async function aiFetch(body, maxAttempts = 2) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("No AI provider configured (OPENROUTER_API_KEY missing)");
  }

  let lastError;

  // Use OpenRouter's native fallback routing
  // Sends models array + route="fallback" — OpenRouter retries the next model if primary fails
  const requestBody = {
    ...body,
    models: FALLBACK_MODELS,
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
        console.warn("[ai] OpenRouter rate limited, retrying...");
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      if (res.status === 402) {
        const err = new Error("OpenRouter credits exhausted");
        Sentry.captureException(err, {
          level: "fatal",
          tags: { source: "ai-provider", provider: "openrouter", reason: "credits_exhausted" },
        });
        console.error("[ai] CRITICAL: OpenRouter credits exhausted!");
        throw err;
      }

      return res;
    } catch (err) {
      lastError = err;
      if (err.name === 'AbortError') {
        console.error(`[ai] OpenRouter timed out (attempt ${attempt + 1})`);
        if (attempt < maxAttempts - 1) {
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
      } else if (err.message === "OpenRouter credits exhausted") {
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

// ── Request builders ───────────────────────────────────────────────────────

export function buildReasoningRequest({
  messages,
  maxCompletionTokens = 3000,
  temperature = 0.2,
}) {
  return {
    model: getAIModel(),
    messages,
    temperature,
    top_p: 1,
    max_tokens: maxCompletionTokens,
    stream: false,
  };
}

export function buildStructuredRequest({
  messages,
  schemaName,
  schema,
  maxCompletionTokens = 2500,
  temperature = 0.1,
}) {
  return {
    model: getAIModel(),
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

// Exported for streaming route fallback
export { GROQ_BASE_URL, GROQ_FALLBACK_MODELS };
