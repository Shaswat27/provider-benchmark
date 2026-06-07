"use client";

import { ComparisonSummary } from "@/app/components/ComparisonSummary";
import { ProviderPanel } from "@/app/components/ProviderPanel";
import {
  createEmptyPanelState,
  type ProviderPanelState,
} from "@/app/lib/parse-ndjson-stream";
import {
  aggregateMedians,
  sampleFromPanelState,
  summarizeMultiRun,
  type RunSample,
} from "@/app/lib/benchmark-stats";
import { BENCHMARK_MODELS, getModelById } from "@/app/lib/models";
import { runProvider } from "@/app/lib/run-provider";
import { useEffect, useRef, useState } from "react";

const RUNS_PER_BENCHMARK_OPTIONS = [1, 3, 5] as const;
type RunsPerBenchmark = (typeof RUNS_PER_BENCHMARK_OPTIONS)[number];

const inputClassName =
  "w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-sm outline-none ring-zinc-300 placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:ring-zinc-600 dark:focus:border-zinc-500";

function finalizeMultiRunPanel(
  samples: RunSample[],
  lastState: ProviderPanelState,
  lastSuccessfulState: ProviderPanelState | null,
  totalRuns: number,
): ProviderPanelState {
  const medians = aggregateMedians(samples);
  const summary = summarizeMultiRun(samples, totalRuns);
  const outputState = lastSuccessfulState ?? lastState;

  if (!medians || !summary) {
    return {
      ...lastState,
      isStreaming: false,
      multiRunSummary: null,
    };
  }

  return {
    ...outputState,
    ttftMs: medians.ttftMs,
    totalMs: medians.totalMs,
    tokensPerSec: medians.tokensPerSec,
    completionTokens: medians.completionTokens,
    error: null,
    isStreaming: false,
    multiRunSummary: summary,
  };
}

export default function HomePage() {
  const [modelId, setModelId] = useState(BENCHMARK_MODELS[0].id);
  const [runsPerBenchmark, setRunsPerBenchmark] = useState<RunsPerBenchmark>(1);
  const [userPrompt, setUserPrompt] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [fireworks, setFireworks] = useState(createEmptyPanelState);
  const [together, setTogether] = useState(createEmptyPanelState);
  const [isRunning, setIsRunning] = useState(false);
  const [runProgress, setRunProgress] = useState<{ current: number; total: number } | null>(
    null,
  );
  const promptTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const selectedModel = getModelById(modelId);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  function autoGrowPromptTextarea() {
    const el = promptTextareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    el.style.overflowY = el.scrollHeight > 200 ? "auto" : "hidden";
  }

  function resetBenchmark() {
    setUserPrompt("");
    setSystemPrompt("");
    setFireworks(createEmptyPanelState());
    setTogether(createEmptyPanelState());
    if (promptTextareaRef.current) {
      promptTextareaRef.current.style.height = "auto";
    }
  }

  async function runBenchmark() {
    const trimmedPrompt = userPrompt.trim();
    if (!trimmedPrompt || isRunning) return;

    const model = getModelById(modelId);
    if (!model) return;

    const messages: { role: string; content: string }[] = [];
    if (systemPrompt.trim()) {
      messages.push({ role: "system", content: systemPrompt.trim() });
    }
    messages.push({ role: "user", content: trimmedPrompt });

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsRunning(true);
    setRunProgress(runsPerBenchmark > 1 ? { current: 0, total: runsPerBenchmark } : null);
    setFireworks(createEmptyPanelState());
    setTogether(createEmptyPanelState());

    const fireworksSamples: RunSample[] = [];
    const togetherSamples: RunSample[] = [];
    let lastFireworks = createEmptyPanelState();
    let lastTogether = createEmptyPanelState();
    let lastSuccessfulFireworks: ProviderPanelState | null = null;
    let lastSuccessfulTogether: ProviderPanelState | null = null;

    try {
      for (let runIndex = 0; runIndex < runsPerBenchmark; runIndex += 1) {
        if (controller.signal.aborted) break;

        if (runsPerBenchmark > 1) {
          setRunProgress({ current: runIndex + 1, total: runsPerBenchmark });
        }

        setFireworks(createEmptyPanelState());
        setTogether(createEmptyPanelState());

        const runStart = performance.now();

        const [fireworksResult, togetherResult] = await Promise.all([
          runProvider(
            "/api/fireworks",
            model.fireworksModel,
            messages,
            runStart,
            (update) => setFireworks((prev) => ({ ...prev, ...update })),
            controller.signal,
          ),
          runProvider(
            "/api/together",
            model.togetherModel,
            messages,
            runStart,
            (update) => setTogether((prev) => ({ ...prev, ...update })),
            controller.signal,
          ),
        ]);

        lastFireworks = fireworksResult;
        lastTogether = togetherResult;

        const fireworksSample = sampleFromPanelState(fireworksResult);
        const togetherSample = sampleFromPanelState(togetherResult);

        if (fireworksSample) {
          fireworksSamples.push(fireworksSample);
          lastSuccessfulFireworks = fireworksResult;
        }
        if (togetherSample) {
          togetherSamples.push(togetherSample);
          lastSuccessfulTogether = togetherResult;
        }

        if (runsPerBenchmark === 1) {
          return;
        }
      }

      if (controller.signal.aborted) return;

      setFireworks(
        finalizeMultiRunPanel(
          fireworksSamples,
          lastFireworks,
          lastSuccessfulFireworks,
          runsPerBenchmark,
        ),
      );
      setTogether(
        finalizeMultiRunPanel(
          togetherSamples,
          lastTogether,
          lastSuccessfulTogether,
          runsPerBenchmark,
        ),
      );
    } finally {
      if (!controller.signal.aborted) {
        setIsRunning(false);
        setRunProgress(null);
      }
    }
  }

  return (
    <div className="min-h-full bg-zinc-50 px-3 py-6 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 sm:px-4 sm:py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Fireworks vs Together
          </p>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Provider Benchmark
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Compare the same open model on Fireworks and Together AI side by side.
            Metrics are measured in your browser from parallel runs.
          </p>
        </header>

        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="model-select" className="text-sm font-medium">
                Model
              </label>
              <select
                id="model-select"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                disabled={isRunning}
                className={inputClassName}
              >
                {BENCHMARK_MODELS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label}
                  </option>
                ))}
              </select>
              {selectedModel?.notes ? (
                <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {selectedModel.notes}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="runs-select" className="text-sm font-medium">
                Runs per benchmark
              </label>
              <select
                id="runs-select"
                value={runsPerBenchmark}
                onChange={(e) =>
                  setRunsPerBenchmark(Number(e.target.value) as RunsPerBenchmark)
                }
                disabled={isRunning}
                className={inputClassName}
              >
                {RUNS_PER_BENCHMARK_OPTIONS.map((runs) => (
                  <option key={runs} value={runs}>
                    {runs} {runs === 1 ? "(default)" : ""}
                  </option>
                ))}
              </select>
              <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                {runsPerBenchmark === 1
                  ? "Single parallel pair — same as before."
                  : `${runsPerBenchmark} sequential parallel pairs. Medians exclude failed runs; min–max shown when 2+ runs succeed.`}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <label htmlFor="user-prompt" className="text-sm font-medium">
                Your prompt
              </label>
              <textarea
                id="user-prompt"
                ref={promptTextareaRef}
                value={userPrompt}
                onChange={(e) => {
                  setUserPrompt(e.target.value);
                  autoGrowPromptTextarea();
                }}
                placeholder="Enter a prompt to benchmark on both providers..."
                rows={5}
                disabled={isRunning}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-zinc-300 placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:ring-zinc-600 dark:focus:border-zinc-500"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="system-prompt"
                className="text-xs font-medium text-zinc-500 dark:text-zinc-400"
              >
                System prompt (optional)
              </label>
              <textarea
                id="system-prompt"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Optional system instructions shared by both runs..."
                rows={3}
                disabled={isRunning}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-zinc-300 placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:ring-zinc-600 dark:focus:border-zinc-500"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-col items-stretch gap-2 border-t border-zinc-100 pt-5 sm:flex-row sm:items-center dark:border-zinc-800">
            <button
              type="button"
              disabled={!userPrompt.trim() || isRunning}
              onClick={() => void runBenchmark()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              {isRunning ? (
                <>
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  {runProgress
                    ? `Running… (${runProgress.current}/${runProgress.total})`
                    : "Running…"}
                </>
              ) : (
                "Run benchmark"
              )}
            </button>
            <button
              type="button"
              onClick={resetBenchmark}
              disabled={isRunning}
              className="rounded-xl border border-zinc-300 bg-white px-6 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Reset
            </button>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Results
          </h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ProviderPanel
              providerName="Fireworks"
              modelSlug={selectedModel?.fireworksModel ?? ""}
              state={fireworks}
              accentClassName="border-t-2 border-t-amber-400 dark:border-t-amber-600/70"
            />
            <ProviderPanel
              providerName="Together AI"
              modelSlug={selectedModel?.togetherModel ?? ""}
              state={together}
              accentClassName="border-t-2 border-t-blue-500 dark:border-t-blue-500/70"
            />
          </div>
        </section>

        <ComparisonSummary fireworks={fireworks} together={together} />

        <footer className="border-t border-zinc-200 pt-5 text-xs leading-relaxed text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          <p>
            Both providers are called in parallel from your browser. TTFT, total
            time, and throughput are client-measured and may vary with caching,
            region, and load.
          </p>
          <p className="mt-2">
            Models are paired from each provider&apos;s registry for rough
            comparability — check the notes above for quantization, context
            length, and other differences before drawing conclusions.
          </p>
        </footer>
      </div>
    </div>
  );
}
