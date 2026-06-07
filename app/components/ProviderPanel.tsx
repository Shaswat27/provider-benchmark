"use client";

import { MarkdownOutput } from "@/app/components/MarkdownOutput";
import { MetricsBadge } from "@/app/components/MetricsBadge";
import type { ProviderPanelState } from "@/app/lib/parse-ndjson-stream";
import { useEffect, useState } from "react";

type ProviderPanelProps = {
  providerName: string;
  modelSlug: string;
  state: ProviderPanelState;
  accentClassName: string;
};

async function copyToClipboard(text: string) {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function ProviderPanel({
  providerName,
  modelSlug,
  state,
  accentClassName,
}: ProviderPanelProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function handleCopy() {
    const success = await copyToClipboard(state.output);
    if (success) setCopied(true);
  }

  const showEmptyState =
    !state.output && !state.error && !state.isStreaming;
  const hasOutput = Boolean(state.output);

  return (
    <article
      className={`overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${accentClassName}`}
    >
      <div className="border-b border-zinc-100 p-4 dark:border-zinc-800">
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {providerName}
            </h2>
            <p className="mt-0.5 break-all font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
              {modelSlug}
            </p>
          </div>
          <MetricsBadge
            ttftMs={state.ttftMs}
            totalMs={state.totalMs}
            completionTokens={state.completionTokens}
            tokensPerSec={state.tokensPerSec}
            isStreaming={state.isStreaming}
            multiRunSummary={state.multiRunSummary}
          />
        </div>
      </div>

      <div
        className={`bg-zinc-50/80 p-4 dark:bg-zinc-950 ${showEmptyState ? "min-h-24" : ""}`}
      >
        {hasOutput ? (
          <div className="mb-2 flex items-center justify-end border-b border-zinc-100 pb-2 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-600 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        ) : null}
        <MarkdownOutput content={state.output} />
        {state.error ? (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">
            {state.error}
          </p>
        ) : null}
        {showEmptyState ? (
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Run a benchmark to stream output here.
          </p>
        ) : null}
      </div>
    </article>
  );
}
