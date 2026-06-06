"use client";

import { BENCHMARK_MODELS } from "@/app/lib/models";
import { useState } from "react";

export default function HomePage() {
  const [selectedModelId, setSelectedModelId] = useState(
    BENCHMARK_MODELS[0].id,
  );

  return (
    <div className="min-h-full bg-zinc-50 px-4 py-6 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 sm:py-8">
      <div className="mx-auto flex w-full max-w-[900px] flex-col gap-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Provider Benchmark
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Fireworks vs Together AI
          </p>
        </header>

        <div className="space-y-2">
          <label htmlFor="model-select" className="text-sm font-medium">
            Model
          </label>
          <select
            id="model-select"
            value={selectedModelId}
            onChange={(e) => setSelectedModelId(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-sm outline-none ring-zinc-300 focus:border-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:ring-zinc-600 dark:focus:border-zinc-500"
          >
            {BENCHMARK_MODELS.map((model) => (
              <option key={model.id} value={model.id}>
                {model.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
