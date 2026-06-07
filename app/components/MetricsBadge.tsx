type MetricsBadgeProps = {
  ttftMs: number | null;
  totalMs: number | null;
  completionTokens: number | null;
  tokensPerSec: number | null;
  isStreaming: boolean;
};

function formatTtft(ttftMs: number | null): string {
  if (ttftMs == null) return "TTFT —";
  return `TTFT ${Math.round(ttftMs)} ms`;
}

function formatTotal(totalMs: number | null): string {
  if (totalMs == null) return "—";
  return `${(totalMs / 1000).toFixed(1)} s`;
}

function formatTokens(completionTokens: number | null): string {
  if (completionTokens == null) return "— tok";
  return `${completionTokens} tok`;
}

function formatTokensPerSec(tokensPerSec: number | null): string {
  if (tokensPerSec == null) return "— tok/s";
  return `${tokensPerSec.toFixed(1)} tok/s`;
}

export function MetricsBadge({
  ttftMs,
  totalMs,
  completionTokens,
  tokensPerSec,
  isStreaming,
}: MetricsBadgeProps) {
  const parts = [
    formatTtft(ttftMs),
    formatTotal(totalMs),
    formatTokens(completionTokens),
    formatTokensPerSec(tokensPerSec),
  ];

  return (
    <div className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
      <span>{parts.join(" · ")}</span>
      {isStreaming ? (
        <span className="ml-1.5 animate-pulse text-zinc-400 dark:text-zinc-500">
          streaming…
        </span>
      ) : null}
      <p className="mt-1 text-[10px] leading-snug text-zinc-400 dark:text-zinc-500">
        TTFT = first visible token · tok/s = completion_tokens ÷ (total − TTFT)
      </p>
    </div>
  );
}
