import { createHash } from "crypto";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type OpenAI from "openai";

export const COMPLETION_TOKEN_LIMIT = 2048;
export const DEFAULT_TEMPERATURE = 0.7;

export type ChatOptions = {
  model: string;
  messages: ChatCompletionMessageParam[];
  stream: true;
  max_tokens: number;
  temperature: number;
  stream_options: { include_usage: true };
  thinking?: { type: "disabled" };
};

/** True for Kimi and DeepSeek V4 model ids (both provider path formats). */
export function shouldDisableThinking(model: string): boolean {
  const normalized = model.toLowerCase();
  return normalized.includes("kimi") || normalized.includes("deepseek-v4");
}

/** Sticky routing key for prompt-cache hits when the system prompt is stable. */
export function getSessionAffinityKey(
  model: string,
  messages: ChatCompletionMessageParam[],
): string | undefined {
  const systemMessage = messages.find((m) => m.role === "system");
  const systemContent =
    typeof systemMessage?.content === "string" ? systemMessage.content.trim() : "";

  if (!systemContent) return undefined;

  const systemHash = createHash("sha256")
    .update(systemContent)
    .digest("hex")
    .slice(0, 16);

  return `${model}:${systemHash}`;
}

export function buildChatOptions(
  model: string,
  messages: ChatCompletionMessageParam[],
): ChatOptions {
  return {
    model,
    messages,
    stream: true,
    max_tokens: COMPLETION_TOKEN_LIMIT,
    temperature: DEFAULT_TEMPERATURE,
    stream_options: { include_usage: true },
    ...(shouldDisableThinking(model) ? { thinking: { type: "disabled" } } : {}),
  };
}

type ChatCompletionChunk = OpenAI.Chat.Completions.ChatCompletionChunk;

/**
 * Stream only user-visible answer text. Ignores `reasoning_content` and strips
 * any inline `<think>` tags that appear in `content`.
 */
export function createAnswerOnlyStream(
  stream: AsyncIterable<ChatCompletionChunk>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      let buffer = "";
      let inThinkBlock = false;

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        // reasoning_content is intentionally ignored
        const text = delta.content ?? "";
        if (!text) continue;

        buffer += text;

        if (buffer.includes("<think>")) inThinkBlock = true;
        if (buffer.includes("</think>")) {
          inThinkBlock = false;
          buffer = (buffer.split("</think>").pop() || "").trimStart();
        }

        if (!inThinkBlock && buffer && !buffer.includes("<think>")) {
          controller.enqueue(encoder.encode(buffer));
          buffer = "";
        }
      }

      if (buffer && !inThinkBlock) controller.enqueue(encoder.encode(buffer));
      controller.close();
    },
  });
}
