export type RunSample = {
  ttftMs: number;
  totalMs: number;
  tokensPerSec: number;
  completionTokens: number | null;
};

export type MetricRange = {
  min: number;
  max: number;
};

export type MultiRunSummary = {
  ttftMs: MetricRange;
  totalMs: MetricRange;
  tokensPerSec: MetricRange;
  successfulRuns: number;
  totalRuns: number;
};

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function metricRange(values: number[]): MetricRange | null {
  if (values.length === 0) return null;
  return { min: Math.min(...values), max: Math.max(...values) };
}

export function sampleFromPanelState(state: {
  ttftMs: number | null;
  totalMs: number | null;
  tokensPerSec: number | null;
  completionTokens: number | null;
  error: string | null;
}): RunSample | null {
  if (
    state.error ||
    state.ttftMs == null ||
    state.totalMs == null ||
    state.tokensPerSec == null
  ) {
    return null;
  }

  return {
    ttftMs: state.ttftMs,
    totalMs: state.totalMs,
    tokensPerSec: state.tokensPerSec,
    completionTokens: state.completionTokens,
  };
}

export function summarizeMultiRun(
  samples: RunSample[],
  totalRuns: number,
): MultiRunSummary | null {
  if (samples.length === 0) return null;

  const ttftRange = metricRange(samples.map((s) => s.ttftMs));
  const totalRange = metricRange(samples.map((s) => s.totalMs));
  const tokRange = metricRange(samples.map((s) => s.tokensPerSec));

  if (!ttftRange || !totalRange || !tokRange) return null;

  return {
    ttftMs: ttftRange,
    totalMs: totalRange,
    tokensPerSec: tokRange,
    successfulRuns: samples.length,
    totalRuns,
  };
}

export function aggregateMedians(samples: RunSample[]): {
  ttftMs: number;
  totalMs: number;
  tokensPerSec: number;
  completionTokens: number | null;
} | null {
  const ttftMed = median(samples.map((s) => s.ttftMs));
  const totalMed = median(samples.map((s) => s.totalMs));
  const tokMed = median(samples.map((s) => s.tokensPerSec));

  if (ttftMed == null || totalMed == null || tokMed == null) return null;

  const lastWithTokens = [...samples]
    .reverse()
    .find((s) => s.completionTokens != null);

  return {
    ttftMs: ttftMed,
    totalMs: totalMed,
    tokensPerSec: tokMed,
    completionTokens: lastWithTokens?.completionTokens ?? null,
  };
}

export function multiRunNote(summary: MultiRunSummary): string {
  const { successfulRuns, totalRuns } = summary;
  if (successfulRuns === totalRuns) {
    return `Medians from ${successfulRuns}/${totalRuns} runs`;
  }
  return `Medians from ${successfulRuns}/${totalRuns} runs (failed runs excluded)`;
}
