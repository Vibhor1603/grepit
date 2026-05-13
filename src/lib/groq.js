const GROQ_BASE_URL = "https://api.groq.com/openai/v1/chat/completions";

// Model fallback chain — if primary is rate-limited, try the next
const MODELS = [
  "llama-3.3-70b-versatile",    // Best quality
  "openai/gpt-oss-20b",         // Fast, higher limits
  "llama-3.1-8b-instant",       // Very fast fallback
  "qwen/qwen3-32b",             // Good quality but tiny TPM limit
];

export function getGroqApiUrl() {
  return GROQ_BASE_URL;
}

export function getGroqDefaultHeaders() {
  return {
    Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    "Content-Type": "application/json",
  };
}

export function getGroqModel() {
  return MODELS[0];
}

// ── Fetch with model fallback and timeout ─────────────────────────────────
export async function groqFetch(body, maxAttempts = 2) {
  let lastError;

  for (const model of MODELS) {
    const requestBody = { ...body, model };

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        const res = await fetch(GROQ_BASE_URL, {
          method: "POST",
          headers: getGroqDefaultHeaders(),
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        // Rate limited — try next model
        if (res.status === 429 || res.status === 413) {
          console.log(`[groq] Model ${model} rate-limited/too-large (${res.status}), trying next...`);
          break; // break inner loop, continue to next model
        }

        // Server error — retry same model
        if (res.status === 503 && attempt < maxAttempts - 1) {
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }

        return res;
      } catch (err) {
        lastError = err;
        if (err.name === 'AbortError') {
          console.error(`[groq] Model ${model} timed out, trying next...`);
          break; // try next model
        }
        if (attempt < maxAttempts - 1) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }
  }
  throw lastError || new Error("All Groq models failed");
}

// ── Request builders ───────────────────────────────────────────────────────

export function buildGroqReasoningRequest({
  messages,
  maxCompletionTokens = 2400,
  temperature = 0.2,
}) {
  return {
    model: MODELS[0], // will be overridden by groqFetch fallback
    messages,
    temperature,
    top_p: 1,
    max_tokens: maxCompletionTokens,
    stream: false,
  };
}

export function buildGroqStructuredRequest({
  messages,
  schemaName,
  schema,
  maxCompletionTokens = 2200,
  temperature = 0.1,
}) {
  return {
    model: MODELS[0],
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
