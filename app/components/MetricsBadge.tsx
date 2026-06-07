import type { MultiRunSummary } from "@/app/lib/benchmark-stats";
import { multiRunNote } from "@/app/lib/benchmark-stats";

type MetricsBadgeProps = {
  ttftMs: number | null;
  totalMs: number | null;
  completionTokens: number | null;
  tokensPerSec: number | null;
  isStreaming: boolean;
  multiRunSummary?: MultiRunSummary | null;
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
  multiRunSummary,
}: MetricsBadgeProps) {
  const parts = [
    formatTtft(ttftMs),
    formatTotal(totalMs),
    formatTokens(completionTokens),
    formatTokensPerSec(tokensPerSec),
  ];

  const showRanges =
    multiRunSummary != null && multiRunSummary.successfulRuns > 1;

  return (
    <div className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
      <span>{parts.join(" · ")}</span>
      {isStreaming ? (
        <span className="ml-1.5 animate-pulse text-zinc-400 dark:text-zinc-500">
          streaming…
        </span>
      ) : null}
      {showRanges ? (
        <p className="mt-0.5 text-[10px] leading-snug text-zinc-400 dark:text-zinc-500">
          {formatRangeMs(multiRunSummary.ttftMs.min, multiRunSummary.ttftMs.max)}{" "}
          ·{" "}
          {formatRangeSec(
            multiRunSummary.totalMs.min,
            multiRunSummary.totalMs.max,
          )}{" "}
          ·{" "}
          {formatRangeTokPerSec(
            multiRunSummary.tokensPerSec.min,
            multiRunSummary.tokensPerSec.max,
          )}
        </p>
      ) : null}
      {multiRunSummary && !isStreaming ? (
        <p className="mt-0.5 text-[10px] leading-snug text-zinc-400 dark:text-zinc-500">
          {multiRunNote(multiRunSummary)}
        </p>
      ) : null}
      <p className="mt-1 text-[10px] leading-snug text-zinc-400 dark:text-zinc-500">
        {showRanges
          ? "Median TTFT · median total · median tok/s (min–max above)"
          : "TTFT = first visible token · tok/s = completion_tokens ÷ (total − TTFT)"}
      </p>
    </div>
  );
}

function formatRangeMs(min: number, max: number): string {
  return `${Math.round(min)}–${Math.round(max)} ms`;
}

function formatRangeSec(min: number, max: number): string {
  return `${(min / 1000).toFixed(1)}–${(max / 1000).toFixed(1)} s`;
}

function formatRangeTokPerSec(min: number, max: number): string {
  return `${min.toFixed(1)}–${max.toFixed(1)} tok/s`;
}
