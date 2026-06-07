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

type ComparisonRow = {
  label: string;
  fireworksValue: string;
  togetherValue: string;
  winnerLabel: string | null;
};

function buildRow(
  label: string,
  fireworksRaw: number,
  togetherRaw: number,
  formatValue: (value: number) => string,
  lowerIsBetter: boolean,
): ComparisonRow {
  const fireworksValue = formatValue(fireworksRaw);
  const togetherValue = formatValue(togetherRaw);

  if (fireworksRaw === togetherRaw) {
    return { label, fireworksValue, togetherValue, winnerLabel: "Tie" };
  }

  const delta = percentDelta(fireworksRaw, togetherRaw);
  if (delta === 0) {
    return { label, fireworksValue, togetherValue, winnerLabel: "Tie" };
  }

  if (lowerIsBetter) {
    if (fireworksRaw < togetherRaw) {
      return {
        label,
        fireworksValue,
        togetherValue,
        winnerLabel: `Fireworks ${delta}% faster`,
      };
    }
    return {
      label,
      fireworksValue,
      togetherValue,
      winnerLabel: `Together ${delta}% faster`,
    };
  }

  if (fireworksRaw > togetherRaw) {
    return {
      label,
      fireworksValue,
      togetherValue,
      winnerLabel: `Fireworks ${delta}% higher`,
    };
  }
  return {
    label,
    fireworksValue,
    togetherValue,
    winnerLabel: `Together ${delta}% higher`,
  };
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

function WinnerPill({ label }: { label: string | null }) {
  if (!label) return null;

  const isTie = label === "Tie";

  return (
    <span
      className={`inline-flex shrink-0 items-center self-start rounded-full px-2 py-0.5 text-[11px] font-medium sm:self-center ${
        isTie
          ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
          : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
      }`}
    >
      {label}
    </span>
  );
}

export function ComparisonSummary({
  fireworks,
  together,
}: ComparisonSummaryProps) {
  if (!canShowComparisonSummary(fireworks, together)) return null;

  const rows: ComparisonRow[] = [];

  if (fireworks.ttftMs != null && together.ttftMs != null) {
    rows.push(
      buildRow(
        "TTFT",
        fireworks.ttftMs,
        together.ttftMs,
        (value) => `${Math.round(value)} ms`,
        true,
      ),
    );
  }

  rows.push(
    buildRow(
      "Total",
      fireworks.totalMs!,
      together.totalMs!,
      (value) => `${(value / 1000).toFixed(1)} s`,
      true,
    ),
  );

  if (fireworks.tokensPerSec != null && together.tokensPerSec != null) {
    rows.push(
      buildRow(
        "tok/s",
        fireworks.tokensPerSec,
        together.tokensPerSec,
        (value) => value.toFixed(1),
        false,
      ),
    );
  }

  const usesMedians =
    fireworks.multiRunSummary != null || together.multiRunSummary != null;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Comparison
        </h3>
        {usesMedians ? (
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Median metrics per provider (failed runs excluded)
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex flex-col gap-3 rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-950/50"
          >
            <span className="w-14 shrink-0 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              {row.label}
            </span>
            <div className="grid flex-1 grid-cols-2 gap-3 text-xs tabular-nums sm:max-w-md">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  Fireworks
                </p>
                <p className="font-medium text-zinc-800 dark:text-zinc-200">
                  {row.fireworksValue}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  Together
                </p>
                <p className="font-medium text-zinc-800 dark:text-zinc-200">
                  {row.togetherValue}
                </p>
              </div>
            </div>
            <WinnerPill label={row.winnerLabel} />
          </div>
        ))}
      </div>
    </section>
  );
}
