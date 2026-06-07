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
  if (ttftMs == null) return "—";
  return `${Math.round(ttftMs)} ms`;
}

function formatTotal(totalMs: number | null): string {
  if (totalMs == null) return "—";
  return `${(totalMs / 1000).toFixed(1)} s`;
}

function formatTokens(completionTokens: number | null): string {
  if (completionTokens == null) return "—";
  return String(completionTokens);
}

function formatTokensPerSec(tokensPerSec: number | null): string {
  if (tokensPerSec == null) return "—";
  return tokensPerSec.toFixed(1);
}

function formatRangeMs(min: number, max: number): string {
  return `${Math.round(min)}–${Math.round(max)} ms`;
}

function formatRangeSec(min: number, max: number): string {
  return `${(min / 1000).toFixed(1)}–${(max / 1000).toFixed(1)} s`;
}

function formatRangeTokPerSec(min: number, max: number): string {
  return `${min.toFixed(1)}–${max.toFixed(1)}`;
}

type StatCellProps = {
  label: string;
  value: string;
  suffix?: string;
  compact?: boolean;
};

function StatCell({ label, value, suffix, compact }: StatCellProps) {
  return (
    <div
      className="min-w-0 rounded-lg border border-zinc-100 bg-zinc-50/80 px-2 py-1 dark:border-zinc-800 dark:bg-zinc-900/60"
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
        {label}
      </p>
      <p
        className={`truncate font-medium tabular-nums text-zinc-800 dark:text-zinc-200 ${compact ? "text-[11px]" : "text-xs"}`}
      >
        {value}
        {suffix ? (
          <span className="ml-0.5 font-normal text-zinc-500 dark:text-zinc-400">
            {suffix}
          </span>
        ) : null}
      </p>
    </div>
  );
}

export function MetricsBadge({
  ttftMs,
  totalMs,
  completionTokens,
  tokensPerSec,
  isStreaming,
  multiRunSummary,
}: MetricsBadgeProps) {
  const showRanges =
    multiRunSummary != null && multiRunSummary.successfulRuns > 1;

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          Metrics
        </p>
        {isStreaming ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Streaming
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatCell label="TTFT" value={formatTtft(ttftMs)} />
        <StatCell label="Total" value={formatTotal(totalMs)} />
        <StatCell label="Tokens" value={formatTokens(completionTokens)} />
        <StatCell label="tok/s" value={formatTokensPerSec(tokensPerSec)} />
      </div>

      {showRanges ? (
        <div className="mt-2 grid grid-cols-3 gap-2">
          <StatCell
            compact
            label="TTFT range"
            value={formatRangeMs(
              multiRunSummary.ttftMs.min,
              multiRunSummary.ttftMs.max,
            )}
          />
          <StatCell
            compact
            label="Total range"
            value={formatRangeSec(
              multiRunSummary.totalMs.min,
              multiRunSummary.totalMs.max,
            )}
          />
          <StatCell
            compact
            label="tok/s range"
            value={formatRangeTokPerSec(
              multiRunSummary.tokensPerSec.min,
              multiRunSummary.tokensPerSec.max,
            )}
            suffix="tok/s"
          />
        </div>
      ) : null}

      {multiRunSummary && !isStreaming ? (
        <p className="mt-1 text-[10px] leading-snug text-zinc-400 dark:text-zinc-500">
          {multiRunNote(multiRunSummary)}
        </p>
      ) : null}

      <details className="mt-1 group">
        <summary className="cursor-pointer text-[10px] text-zinc-400 transition hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-400">
          How metrics are measured
        </summary>
        <p className="mt-1 text-[10px] leading-snug text-zinc-400 dark:text-zinc-500">
          {showRanges
            ? "Median TTFT, total time, and tok/s with min–max ranges above. Failed runs excluded."
            : "TTFT = first visible token. tok/s = completion_tokens ÷ (total − TTFT)."}
        </p>
      </details>
    </div>
  );
}
