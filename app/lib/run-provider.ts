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
): Promise<ProviderPanelState> {
  let state: ProviderPanelState = { ...createEmptyPanelState(), isStreaming: true };
  onUpdate({ ...createEmptyPanelState(), isStreaming: true });

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages }),
      signal,
    });

    if (!response.body) {
      const update = {
        error: "No response body",
        isStreaming: false,
      };
      state = { ...state, ...update };
      onUpdate(update);
      return state;
    }

    let sawTerminalEvent = false;
    const trackUpdate = (update: Partial<ProviderPanelState>) => {
      state = { ...state, ...update };
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
      return state;
    }

    if (!response.ok && !sawTerminalEvent) {
      const update = {
        error: `Request failed (${response.status})`,
        isStreaming: false,
      };
      state = { ...state, ...update };
      onUpdate(update);
    }

    return state;
  } catch (error) {
    if (isAbortError(error)) {
      state = { ...state, isStreaming: false };
      onUpdate({ isStreaming: false });
      return state;
    }

    const update = {
      error: error instanceof Error ? error.message : "Request failed",
      isStreaming: false,
    };
    state = { ...state, ...update };
    onUpdate(update);
    return state;
  }
}
