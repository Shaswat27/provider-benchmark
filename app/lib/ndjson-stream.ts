export type StreamMetrics = {
  serverTtftMs: number;
  promptTokens?: number;
  completionTokens?: number;
};

export function encodeNdjsonLine(obj: unknown): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(`${JSON.stringify(obj)}\n`);
}

/**
 * Wraps a plain-text byte stream as NDJSON: `{"type":"text","delta":...}` lines,
 * then a final `{"type":"done","metrics":...}` line.
 *
 * `serverTtftMs` is measured from stream start until the first non-empty text
 * delta is forwarded.
 */
export function createMetricsNdjsonStream(
  textStream: ReadableStream<Uint8Array>,
  getMetrics: () => Promise<StreamMetrics>,
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();

  return new ReadableStream({
    async start(controller) {
      const streamStartedAt = performance.now();
      let serverTtftMs: number | undefined;
      const reader = textStream.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const delta = decoder.decode(value, { stream: true });
          if (!delta) continue;

          if (serverTtftMs === undefined) {
            serverTtftMs = performance.now() - streamStartedAt;
          }

          controller.enqueue(encodeNdjsonLine({ type: "text", delta }));
        }

        const tail = decoder.decode();
        if (tail) {
          if (serverTtftMs === undefined) {
            serverTtftMs = performance.now() - streamStartedAt;
          }
          controller.enqueue(encodeNdjsonLine({ type: "text", delta: tail }));
        }

        const metrics = await getMetrics();
        controller.enqueue(
          encodeNdjsonLine({
            type: "done",
            metrics: {
              ...metrics,
              serverTtftMs: serverTtftMs ?? metrics.serverTtftMs,
            },
          }),
        );
        controller.close();
      } catch (error) {
        controller.error(error);
      } finally {
        reader.releaseLock();
      }
    },
  });
}
