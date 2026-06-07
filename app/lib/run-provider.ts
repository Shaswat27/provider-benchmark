import {
  createEmptyPanelState,
  parseNdjsonStream,
  type ProviderPanelState,
} from "@/app/lib/parse-ndjson-stream";

type ChatMessage = {
  role: string;
  content: string;
};

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export async function runProvider(
  endpoint: "/api/fireworks" | "/api/together",
  model: string,
  messages: ChatMessage[],
  runStart: number,
  onUpdate: (update: Partial<ProviderPanelState>) => void,
  signal?: AbortSignal,
): Promise<void> {
  onUpdate({ ...createEmptyPanelState(), isStreaming: true });

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages }),
      signal,
    });

    if (!response.body) {
      onUpdate({
        error: "No response body",
        isStreaming: false,
      });
      return;
    }

    let sawTerminalEvent = false;
    const trackUpdate = (update: Partial<ProviderPanelState>) => {
      if (update.error != null || update.isStreaming === false) {
        sawTerminalEvent = true;
      }
      onUpdate(update);
    };

    const result = await parseNdjsonStream(response.body, runStart, trackUpdate);

    if (result === "done" || result === "error") {
      sawTerminalEvent = true;
    }

    if (result === "aborted") {
      return;
    }

    if (!response.ok && !sawTerminalEvent) {
      onUpdate({
        error: `Request failed (${response.status})`,
        isStreaming: false,
      });
    }
  } catch (error) {
    if (isAbortError(error)) {
      onUpdate({ isStreaming: false });
      return;
    }

    onUpdate({
      error: error instanceof Error ? error.message : "Request failed",
      isStreaming: false,
    });
  }
}
