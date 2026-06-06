import {
  buildChatOptions,
  createAnswerOnlyStream,
  getSessionAffinityKey,
} from "@/app/lib/completion-utils";
import {
  createMetricsNdjsonStream,
  encodeNdjsonLine,
} from "@/app/lib/ndjson-stream";
import { NextRequest, NextResponse } from "next/server";
import OpenAI, { APIError } from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

type ChatCompletionChunk = OpenAI.Chat.Completions.ChatCompletionChunk;

function ndjsonErrorResponse(message: string, status: number) {
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(encodeNdjsonLine({ type: "error", message }));
      controller.close();
    },
  });

  return new NextResponse(body, {
    status,
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
    },
  });
}

async function* captureUsage(
  stream: AsyncIterable<ChatCompletionChunk>,
  usage: { promptTokens?: number; completionTokens?: number },
) {
  for await (const chunk of stream) {
    if (chunk.usage) {
      usage.promptTokens = chunk.usage.prompt_tokens;
      usage.completionTokens = chunk.usage.completion_tokens;
    }
    yield chunk;
  }
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.FIREWORKS_API_KEY;
    if (!apiKey) {
      return ndjsonErrorResponse("FIREWORKS_API_KEY is not configured", 500);
    }

    const body = await req.json();
    const { model, messages } = body;

    if (typeof model !== "string" || !model) {
      return ndjsonErrorResponse("model is required", 400);
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return ndjsonErrorResponse("messages must be a non-empty array", 400);
    }

    for (const message of messages) {
      if (
        typeof message?.role !== "string" ||
        typeof message?.content !== "string"
      ) {
        return ndjsonErrorResponse(
          "each message must have role and content strings",
          400,
        );
      }
    }

    const chatMessages = messages as ChatCompletionMessageParam[];
    const options = buildChatOptions(model, chatMessages);
    const sessionKey = getSessionAffinityKey(options.model, chatMessages);

    const client = new OpenAI({
      apiKey,
      baseURL: "https://api.fireworks.ai/inference/v1",
    });

    const stream = await client.chat.completions.create(
      options,
      sessionKey
        ? { headers: { "x-session-affinity": sessionKey } }
        : undefined,
    );

    const usage = {
      promptTokens: undefined as number | undefined,
      completionTokens: undefined as number | undefined,
    };

    const textStream = createAnswerOnlyStream(captureUsage(stream, usage));

    const ndjsonStream = createMetricsNdjsonStream(textStream, async () => ({
      serverTtftMs: 0,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
    }));

    return new NextResponse(ndjsonStream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = error instanceof APIError ? (error.status ?? 500) : 500;
    return ndjsonErrorResponse(message, status);
  }
}
