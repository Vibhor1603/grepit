const GROQ_BASE_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "openai/gpt-oss-120b";

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
  return GROQ_MODEL;
}

export function buildGroqReasoningRequest({ messages, maxCompletionTokens = 2400, temperature = 0.2, useCodeInterpreter = false }) {
  return {
    model: GROQ_MODEL,
    messages,
    temperature,
    top_p: 1,
    max_completion_tokens: maxCompletionTokens,
    reasoning_effort: "high",
    include_reasoning: false,
    stream: false,
    ...(useCodeInterpreter
      ? {
          tool_choice: "auto",
          tools: [{ type: "code_interpreter" }],
        }
      : {}),
  };
}

export function buildGroqStructuredRequest({ messages, schemaName, schema, maxCompletionTokens = 2200, temperature = 0.1 }) {
  return {
    model: GROQ_MODEL,
    messages,
    temperature,
    top_p: 1,
    max_completion_tokens: maxCompletionTokens,
    reasoning_effort: "high",
    include_reasoning: false,
    stream: false,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: schemaName,
        strict: true,
        schema,
      },
    },
  };
}
