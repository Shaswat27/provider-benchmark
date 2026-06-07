# Provider Benchmark

Side-by-side benchmark UI that runs the same prompt against paired open models on **Fireworks** and **Together AI** in parallel. Pick a model pair, optionally add a system prompt, and run 1, 3, or 5 sequential benchmark rounds. Each provider panel streams markdown output, shows client-measured latency metrics (TTFT, end-to-end time, tokens/sec), and a comparison summary highlights which provider was faster or had higher throughput.

## Features

- **Model selector** — six paired models (DeepSeek V4 Pro, GLM 5.1, MiniMax M2.7, Qwen 3.6 Plus, Kimi K2.6, OpenAI GPT-OSS 120B) with per-model notes on quantization, context length, and other differences
- **Multi-run benchmarks** — run 1 (default), 3, or 5 sequential parallel pairs; multi-run mode reports **median** TTFT, total time, and tok/s with **min–max** ranges when 2+ runs succeed
- **Comparison summary** — after a successful run, shows side-by-side metrics with percent deltas (e.g. “Fireworks 12% faster”)
- **Optional system prompt** — shared system instructions sent to both providers
- **Copy output** — copy each panel’s streamed markdown to the clipboard
- **Reset** — clear prompts and panel state without reloading

## Prerequisites

- Node.js 20+
- API keys from [Fireworks](https://fireworks.ai/) and [Together AI](https://www.together.ai/)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` in the project root:

```
FIREWORKS_API_KEY=your_fireworks_key
TOGETHER_API_KEY=your_together_key
```

3. Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production build

```bash
npm run build
npm run start
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FIREWORKS_API_KEY` | Yes | Fireworks inference API key |
| `TOGETHER_API_KEY` | Yes | Together AI API key |

If a key is missing, the corresponding `/api/*` route returns an NDJSON error line (HTTP 503) with a readable message such as `FIREWORKS_API_KEY is not configured`. The UI shows that message in the affected panel.

## Metrics

All timing is measured in the browser from a shared `performance.now()` start at the beginning of each run.

| Metric | Definition |
|--------|------------|
| **TTFT** | Time from run start until the first visible text token arrives in that panel |
| **E2E (total)** | Time from run start until the stream sends a `done` event |
| **tok/s** | `completion_tokens ÷ (total_ms − TTFT_ms)` using token counts from the provider's final usage chunk |

Throughput excludes time-to-first-token because TTFT captures queueing and prefill; tok/s reflects generation speed only.

### Single run (default)

One parallel pair: Fireworks and Together are called at the same time. Panel badges show the raw metrics for that run.

### Multi-run (3 or 5)

Runs are **sequential** — each round clears the panels and fires a new parallel pair. After all rounds:

- **Displayed values** are medians across successful runs (failed runs are excluded)
- **Min–max ranges** appear under the badge when at least two runs succeed
- **Output text** comes from the last successful run (or the last run if all failed)
- The **comparison summary** uses each provider’s median metrics

## API routes

Both routes accept `POST` with JSON body `{ "model": string, "messages": [{ "role": string, "content": string }, ...] }` and respond with `application/x-ndjson`:

- `{"type":"text","delta":"..."}` — streamed answer text
- `{"type":"done","metrics":{...}}` — completion with optional `promptTokens`, `completionTokens`, `serverTtftMs`
- `{"type":"error","message":"..."}` — validation or upstream failure

Include a `system` message in `messages` when you want shared instructions (same as the optional system prompt in the UI).

### Fireworks

```bash
curl -N -X POST http://localhost:3000/api/fireworks \
  -H "Content-Type: application/json" \
  -d '{
    "model": "accounts/fireworks/models/gpt-oss-120b",
    "messages": [{ "role": "user", "content": "Say hello in one sentence." }]
  }'
```

### Together AI

```bash
curl -N -X POST http://localhost:3000/api/together \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-oss-120b",
    "messages": [{ "role": "user", "content": "Say hello in one sentence." }]
  }'
```

Use `-N` so curl does not buffer the streamed NDJSON lines.

## Caveats

- **Not a load test** — each round is a single request per provider from your browser; multi-run mode repeats that sequentially, not concurrently.
- **Limited statistical depth** — multi-run medians and min–max ranges help smooth one-off variance, but there are no percentile stats, concurrency sweeps, or sustained throughput measurement.
- **Model parity is approximate** — paired models are chosen from each provider's registry for rough comparability, but quantization, context length, caching, and routing can differ. Read the per-model notes in the UI before drawing conclusions.
- **Client-measured timing** — network path, browser tab throttling, and provider load affect results.

## Stack

- Next.js 16, React 19, TypeScript
- Tailwind CSS 4
- OpenAI SDK (Fireworks + Together compatible)
- react-markdown + remark-gfm
