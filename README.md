# Provider Benchmark

Side-by-side benchmark UI comparing the same open model served through Fireworks vs Together AI.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.local` and add your API keys:

```
FIREWORKS_API_KEY=your_fireworks_key
TOGETHER_API_KEY=your_together_key
```

3. Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Stack

- Next.js 16, React 19, TypeScript
- Tailwind CSS 4
- OpenAI SDK (Fireworks + Together compatible)
- react-markdown + remark-gfm
