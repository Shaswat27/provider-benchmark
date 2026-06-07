import {
  createEmptyPanelState,
  parseNdjsonStream,
  type ProviderPanelState,
} from "@/app/lib/parse-ndjson-stream";

type ChatMessage = {
  role: string;
  content: string;
};

export async function runProvider(
  endpoint: "/api/fireworks" | "/api/together",
  model: string,
  messages: ChatMessage[],
  runStart: number,
  onUpdate: (update: Partial<ProviderPanelState>) => void,
): Promise<void> {
  onUpdate({ ...createEmptyPanelState(), isStreaming: true });

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages }),
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

    const result = await parseNdjsonStream(
      response.body,
      runStart,
      trackUpdate,
      endpoint,
    );

    if (result === "done" || result === "error") {
      sawTerminalEvent = true;
    }

    if (!response.ok && !sawTerminalEvent) {
      onUpdate({
        error: `Request failed (${response.status})`,
        isStreaming: false,
      });
    }
  } catch (error) {
    onUpdate({
      error: error instanceof Error ? error.message : "Request failed",
      isStreaming: false,
    });
  }
}
