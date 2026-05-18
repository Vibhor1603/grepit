import * as Sentry from "@sentry/nextjs";

// ── AI Provider abstraction ──
// Primary: OpenRouter (configured chat model) — 1M context, cheap, fast
// Fallback: Groq (llama-3.1-8b-instant) — free tier

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions";
const GROQ_BASE_URL = "https://api.groq.com/openai/v1/chat/completions";

// Primary model via OpenRouter
const OPENROUTER_MODEL = "REDACTED_CHAT_MODEL";

// Fallback models via Groq (if OpenRouter fails)
const GROQ_FALLBACK_MODELS = [
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
];

export function getAIApiUrl() {
  if (process.env.OPENROUTER_API_KEY) return OPENROUTER_BASE_URL;
  return GROQ_BASE_URL;
}

export function getAIHeaders() {
  if (process.env.OPENROUTER_API_KEY) {
    return {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
      "X-Title": "Vibo Code Analyst",
    };
  }
  return {
    Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    "Content-Type": "application/json",
  };
}

export function getAIModel() {
  if (process.env.OPENROUTER_API_KEY) return OPENROUTER_MODEL;
  return GROQ_FALLBACK_MODELS[0];
}

// ── Fetch with provider fallback ─────────────────────────────────────
export async function aiFetch(body, maxAttempts = 2) {
  let lastError;

  // Try OpenRouter first (if configured)
  if (process.env.OPENROUTER_API_KEY) {
    const requestBody = { ...body, model: OPENROUTER_MODEL };

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 45000);
        const res = await fetch(OPENROUTER_BASE_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
            "X-Title": "Vibo Code Analyst",
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (res.status === 429 && attempt < maxAttempts - 1) {
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }

        if (res.ok || res.status === 429) return res;

        // Non-retryable error from OpenRouter — fall through to Groq
        console.log(`[ai] OpenRouter error ${res.status}, falling back to Groq...`);
        break;
      } catch (err) {
        lastError = err;
        if (err.name === 'AbortError') {
          console.error(`[ai] OpenRouter timed out, falling back to Groq...`);
          break;
        }
        if (attempt < maxAttempts - 1) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }
  }

  // Fallback: Groq
  if (!process.env.GROQ_API_KEY) {
    throw lastError || new Error("No AI provider configured");
  }

  for (const model of GROQ_FALLBACK_MODELS) {
    const requestBody = { ...body, model };

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        const res = await fetch(GROQ_BASE_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (res.status === 429 || res.status === 413) {
          console.log(`[ai] Groq model ${model} rate-limited (${res.status}), trying next...`);
          break;
        }

        if (res.status === 503 && attempt < maxAttempts - 1) {
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }

        return res;
      } catch (err) {
        lastError = err;
        if (err.name === 'AbortError') {
          console.error(`[ai] Groq model ${model} timed out, trying next...`);
          break;
        }
        if (attempt < maxAttempts - 1) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }
  }
  const finalError = lastError || new Error("All AI providers failed");
  Sentry.captureException(finalError, { tags: { source: "ai-provider" } });
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
