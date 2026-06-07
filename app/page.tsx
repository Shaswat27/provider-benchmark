"use client";

import { ComparisonSummary } from "@/app/components/ComparisonSummary";
import { MarkdownOutput } from "@/app/components/MarkdownOutput";
import { MetricsBadge } from "@/app/components/MetricsBadge";
import {
  createEmptyPanelState,
  type ProviderPanelState,
} from "@/app/lib/parse-ndjson-stream";
import { BENCHMARK_MODELS, getModelById } from "@/app/lib/models";
import { runProvider } from "@/app/lib/run-provider";
import { useEffect, useRef, useState } from "react";

type ProviderPanelProps = {
  providerName: string;
  modelSlug: string;
  state: ProviderPanelState;
};

async function copyToClipboard(text: string) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Ignore clipboard errors.
  }
}

function ProviderPanel({ providerName, modelSlug, state }: ProviderPanelProps) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex flex-col gap-2">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold">{providerName}</h2>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {modelSlug}
            </p>
          </div>
          <MetricsBadge
            ttftMs={state.ttftMs}
            totalMs={state.totalMs}
            completionTokens={state.completionTokens}
            tokensPerSec={state.tokensPerSec}
            isStreaming={state.isStreaming}
          />
        </div>
      </div>

      <div className="relative min-h-[220px] rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
        <button
          type="button"
          onClick={() => void copyToClipboard(state.output)}
          disabled={!state.output}
          className="absolute right-3 top-3 rounded-md border border-zinc-300 bg-white px-2 py-1 text-[11px] text-zinc-600 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Copy
        </button>
        <MarkdownOutput content={state.output} />
        {state.error ? (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">
            {state.error}
          </p>
        ) : null}
        {!state.output && !state.error && !state.isStreaming ? (
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Output will appear here after a benchmark run.
          </p>
        ) : null}
      </div>
    </article>
  );
}

export default function HomePage() {
  const [modelId, setModelId] = useState(BENCHMARK_MODELS[0].id);
  const [userPrompt, setUserPrompt] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [fireworks, setFireworks] = useState(createEmptyPanelState);
  const [together, setTogether] = useState(createEmptyPanelState);
  const [isRunning, setIsRunning] = useState(false);
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
    setFireworks(createEmptyPanelState());
    setTogether(createEmptyPanelState());

    const runStart = performance.now();

    try {
      await Promise.all([
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
    } finally {
      if (!controller.signal.aborted) {
        setIsRunning(false);
      }
    }
  }

  return (
    <div className="min-h-full bg-zinc-50 px-4 py-6 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 sm:py-8">
      <div className="mx-auto flex w-full max-w-[900px] flex-col gap-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Provider Benchmark
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Compare the same open model on Fireworks and Together AI side by side.
            Metrics are measured in your browser from parallel runs.
          </p>
        </header>

        <section className="space-y-2">
          <label htmlFor="model-select" className="text-sm font-medium">
            Model
          </label>
          <select
            id="model-select"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            disabled={isRunning}
            className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-sm outline-none ring-zinc-300 focus:border-zinc-400 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:ring-zinc-600 dark:focus:border-zinc-500"
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
        </section>

        <section className="space-y-3">
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
            <label htmlFor="system-prompt" className="text-xs font-medium">
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
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ProviderPanel
            providerName="Fireworks"
            modelSlug={selectedModel?.fireworksModel ?? ""}
            state={fireworks}
          />
          <ProviderPanel
            providerName="Together AI"
            modelSlug={selectedModel?.togetherModel ?? ""}
            state={together}
          />
        </section>

        <ComparisonSummary fireworks={fireworks} together={together} />

        <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
          <button
            type="button"
            disabled={!userPrompt.trim() || isRunning}
            onClick={() => void runBenchmark()}
            className="rounded-xl bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {isRunning ? "Running…" : "Run benchmark"}
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

        <footer className="rounded-2xl border border-zinc-200 bg-white p-4 text-xs leading-relaxed text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
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
