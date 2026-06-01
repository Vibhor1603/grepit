/**
 * Model IDs are configured only via environment variables (never hardcoded in source).
 */

function parseModelList(raw) {
  if (!raw || typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function readChatModelChain() {
  const fromList = parseModelList(process.env.OPENROUTER_CHAT_MODELS);
  if (fromList.length > 0) return fromList;

  const single = process.env.OPENROUTER_CHAT_MODEL?.trim();
  if (single) return [single];

  return [];
}

function chatModelChain() {
  return readChatModelChain();
}

export function getChatModel() {
  const chain = chatModelChain();
  if (!chain.length) {
    throw new Error(
      "AI chat model not configured. Set OPENROUTER_CHAT_MODELS or OPENROUTER_CHAT_MODEL in env.",
    );
  }
  return chain[0];
}

export function getChatModelChain() {
  const chain = chatModelChain();
  if (!chain.length) {
    throw new Error(
      "AI chat model not configured. Set OPENROUTER_CHAT_MODELS or OPENROUTER_CHAT_MODEL in env.",
    );
  }
  return chain;
}

export function getEmbeddingModel() {
  const model = process.env.OPENROUTER_EMBEDDING_MODEL?.trim();
  if (!model) {
    throw new Error("Embedding model not configured. Set OPENROUTER_EMBEDDING_MODEL in env.");
  }
  return model;
}

export function isChatModelConfigured() {
  return chatModelChain().length > 0;
}

export function isEmbeddingModelConfigured() {
  return Boolean(process.env.OPENROUTER_EMBEDDING_MODEL?.trim());
}
