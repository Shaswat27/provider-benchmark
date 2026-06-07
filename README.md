# Provider Benchmark

Side-by-side benchmark UI that runs the same prompt against paired open models on **Fireworks** and **Together AI** in parallel. Each provider panel streams markdown output and shows client-measured latency metrics (TTFT, end-to-end time, tokens/sec).

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

All timing is measured in the browser from a shared `performance.now()` start when you click **Run benchmark**.

| Metric | Definition |
|--------|------------|
| **TTFT** | Time from run start until the first visible text token arrives in that panel |
| **E2E (total)** | Time from run start until the stream sends a `done` event |
| **tok/s** | `completion_tokens ÷ (total_ms − TTFT_ms)` using token counts from the provider's final usage chunk |

Throughput excludes time-to-first-token because TTFT captures queueing and prefill; tok/s reflects generation speed only.

## API routes

Both routes accept `POST` with JSON body `{ "model": string, "messages": [{ "role": string, "content": string }, ...] }` and respond with `application/x-ndjson`:

- `{"type":"text","delta":"..."}` — streamed answer text
- `{"type":"done","metrics":{...}}` — completion with optional `promptTokens`, `completionTokens`, `serverTtftMs`
- `{"type":"error","message":"..."}` — validation or upstream failure

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

- **Not a load test** — each run is a single request per provider from your browser.
- **Single-request latency only** — no concurrency sweeps, percentile stats, or sustained throughput measurement.
- **Model parity is approximate** — paired models are chosen from each provider's registry for rough comparability, but quantization, context length, caching, and routing can differ. Read the per-model notes in the UI before drawing conclusions.
- **Client-measured timing** — network path, browser tab throttling, and provider load affect results.

## Stack

- Next.js 16, React 19, TypeScript
- Tailwind CSS 4
- OpenAI SDK (Fireworks + Together compatible)
- react-markdown + remark-gfm
