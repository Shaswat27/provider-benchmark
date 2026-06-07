import type { MultiRunSummary } from "@/app/lib/benchmark-stats";

export type ProviderPanelState = {
  output: string;
  ttftMs: number | null;
  totalMs: number | null;
  completionTokens: number | null;
  tokensPerSec: number | null;
  error: string | null;
  isStreaming: boolean;
  multiRunSummary?: MultiRunSummary | null;
};

export function createEmptyPanelState(): ProviderPanelState {
  return {
    output: "",
    ttftMs: null,
    totalMs: null,
    completionTokens: null,
    tokensPerSec: null,
    error: null,
    isStreaming: false,
    multiRunSummary: null,
  };
}

export function computeTokensPerSec(
  completionTokens: number | null,
  totalMs: number | null,
  ttftMs: number | null,
): number | null {
  if (
    completionTokens == null ||
    totalMs == null ||
    ttftMs == null ||
    totalMs <= ttftMs
  ) {
    return null;
  }

  const generationSec = (totalMs - ttftMs) / 1000;
  if (generationSec <= 0) return null;
  return completionTokens / generationSec;
}

type NdjsonLine =
  | { type: "text"; delta: string }
  | {
      type: "done";
      metrics: {
        serverTtftMs?: number;
        promptTokens?: number;
        completionTokens?: number;
      };
    }
  | { type: "error"; message: string };

function parseNdjsonLine(line: string): NdjsonLine | null {
  try {
    return JSON.parse(line) as NdjsonLine;
  } catch {
    return null;
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export async function parseNdjsonStream(
  body: ReadableStream<Uint8Array>,
  runStart: number,
  onUpdate: (update: Partial<ProviderPanelState>) => void,
): Promise<"done" | "error" | "incomplete" | "aborted"> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let output = "";
  let clientTtftMs: number | null = null;

  function appendText(delta: string) {
    if (!delta) return;
    if (clientTtftMs == null) {
      clientTtftMs = performance.now() - runStart;
      onUpdate({ ttftMs: clientTtftMs, isStreaming: true });
    }
    output += delta;
    onUpdate({ output, isStreaming: true });
  }

  function finishDone(metrics: NdjsonLine & { type: "done" }) {
    const totalMs = performance.now() - runStart;
    const completionTokens = metrics.metrics.completionTokens ?? null;
    const ttftMs = clientTtftMs;

    onUpdate({
      output,
      ttftMs,
      totalMs,
      completionTokens,
      tokensPerSec: computeTokensPerSec(completionTokens, totalMs, ttftMs),
      isStreaming: false,
    });
  }

  function handleEvent(event: NdjsonLine): "done" | "error" | null {
    if (event.type === "text") {
      appendText(event.delta);
      return null;
    }

    if (event.type === "error") {
      onUpdate({ error: event.message, isStreaming: false });
      return "error";
    }

    finishDone(event);
    return "done";
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        const event = parseNdjsonLine(line);
        if (!event) continue;

        const result = handleEvent(event);
        if (result) return result;
      }
    }

    buffer += decoder.decode();
    if (buffer.trim()) {
      const event = parseNdjsonLine(buffer.trim());
      if (event) {
        const result = handleEvent(event);
        if (result) return result;
      }
    }

    onUpdate({
      error: output ? null : "Stream ended without completion",
      isStreaming: false,
    });
    return "incomplete";
  } catch (error) {
    if (isAbortError(error)) {
      onUpdate({ isStreaming: false });
      return "aborted";
    }
    throw error;
  } finally {
    reader.releaseLock();
  }
}
