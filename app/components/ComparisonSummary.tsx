import type { ProviderPanelState } from "@/app/lib/parse-ndjson-stream";

type ComparisonSummaryProps = {
  fireworks: ProviderPanelState;
  together: ProviderPanelState;
};

function percentDelta(a: number, b: number): number {
  const baseline = Math.min(a, b);
  if (baseline <= 0) return 0;
  return Math.round((Math.abs(a - b) / baseline) * 100);
}

function formatComparisonLine(
  metricLabel: string,
  fireworksValue: number,
  togetherValue: number,
  formatValue: (value: number) => string,
  lowerIsBetter: boolean,
): string {
  const fireworksFormatted = formatValue(fireworksValue);
  const togetherFormatted = formatValue(togetherValue);
  const base = `Fireworks ${metricLabel}: ${fireworksFormatted} · Together ${metricLabel}: ${togetherFormatted}`;

  if (fireworksValue === togetherValue) return base;

  const delta = percentDelta(fireworksValue, togetherValue);
  if (delta === 0) return base;

  if (lowerIsBetter) {
    if (fireworksValue < togetherValue) {
      return `${base} — Fireworks ${delta}% faster`;
    }
    return `${base} — Together ${delta}% faster`;
  }

  if (fireworksValue > togetherValue) {
    return `${base} — Fireworks ${delta}% higher`;
  }
  return `${base} — Together ${delta}% higher`;
}

function canShowComparisonSummary(
  fireworks: ProviderPanelState,
  together: ProviderPanelState,
): boolean {
  return (
    fireworks.totalMs != null &&
    together.totalMs != null &&
    !fireworks.error &&
    !together.error &&
    !fireworks.isStreaming &&
    !together.isStreaming
  );
}

export function ComparisonSummary({
  fireworks,
  together,
}: ComparisonSummaryProps) {
  if (!canShowComparisonSummary(fireworks, together)) return null;

  const lines: string[] = [];

  if (fireworks.ttftMs != null && together.ttftMs != null) {
    lines.push(
      formatComparisonLine(
        "TTFT",
        fireworks.ttftMs,
        together.ttftMs,
        (value) => `${Math.round(value)} ms`,
        true,
      ),
    );
  }

  lines.push(
    formatComparisonLine(
      "total",
      fireworks.totalMs!,
      together.totalMs!,
      (value) => `${(value / 1000).toFixed(1)} s`,
      true,
    ),
  );

  if (fireworks.tokensPerSec != null && together.tokensPerSec != null) {
    lines.push(
      formatComparisonLine(
        "tok/s",
        fireworks.tokensPerSec,
        together.tokensPerSec,
        (value) => value.toFixed(1),
        false,
      ),
    );
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Comparison
      </h3>
      <ul className="space-y-1.5 tabular-nums">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </section>
  );
}
