import Anthropic from "@anthropic-ai/sdk";

function isOverloadedError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.toLowerCase().includes("overloaded") || msg.includes("529");
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isOverloadedError(err) || attempt === maxRetries) break;
      await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
    }
  }
  const msg = lastErr instanceof Error ? lastErr.message : "Unknown error";
  throw new Error(
    isOverloadedError(lastErr)
      ? "Anthropic's servers are briefly overloaded. Wait 30 seconds and try again."
      : msg,
  );
}

// Non-streaming create — works with all models at any max_tokens within their limit.
export async function createWithRetry(
  client: Anthropic,
  params: Anthropic.MessageCreateParamsNonStreaming,
  maxRetries = 2,
): Promise<Anthropic.Message> {
  return withRetry(() => client.messages.create(params), maxRetries);
}

// Streaming fallback — kept for routes that need it (competitor-analysis, conversion-audit).
export async function streamWithRetry(
  client: Anthropic,
  params: Parameters<Anthropic["messages"]["stream"]>[0],
  maxRetries = 2,
): Promise<Anthropic.Message> {
  return withRetry(() => client.messages.stream(params).finalMessage(), maxRetries);
}
