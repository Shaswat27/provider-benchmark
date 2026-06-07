export type BenchmarkModel = {
  id: string;
  label: string;
  fireworksModel: string;
  togetherModel: string;
  notes?: string;
};

export const BENCHMARK_MODELS: BenchmarkModel[] = [
  {
    id: "deepseek-v4-pro",
    label: "DeepSeek V4 Pro",
    fireworksModel: "accounts/fireworks/models/deepseek-v4-pro",
    togetherModel: "deepseek-ai/DeepSeek-V4-Pro",
    notes: "Fireworks: FP8, 1M ctx; Together: FP4, 512K ctx",
  },
  {
    id: "glm-5p1",
    label: "GLM 5.1",
    fireworksModel: "accounts/fireworks/models/glm-5p1",
    togetherModel: "zai-org/GLM-5.1",
    notes: "Both FP4, ~203K ctx",
  },
  {
    id: "minimax-m2p7",
    label: "MiniMax M2.7",
    fireworksModel: "accounts/fireworks/models/minimax-m2p7",
    togetherModel: "MiniMaxAI/MiniMax-M2.7",
    notes: "Both FP4, ~197K ctx; cached input available on both",
  },
  {
    id: "qwen3p6-plus",
    label: "Qwen 3.6 Plus",
    fireworksModel: "accounts/fireworks/models/qwen3p6-plus",
    togetherModel: "Qwen/Qwen3.6-Plus",
    notes: "Fireworks: 128K ctx; Together: 1M ctx",
  },
  {
    id: "kimi-k2p6",
    label: "Kimi K2.6",
    fireworksModel: "accounts/fireworks/models/kimi-k2p6",
    togetherModel: "moonshotai/Kimi-K2.6",
    notes: "Both FP4, 262K ctx; cached input available on both",
  },
  {
    id: "gpt-oss-120b",
    label: "OpenAI GPT-OSS 120B",
    fireworksModel: "accounts/fireworks/models/gpt-oss-120b",
    togetherModel: "openai/gpt-oss-120b",
    notes: "Both MXFP4, 128K ctx",
  },
];

export function getModelById(id: string): BenchmarkModel | undefined {
  return BENCHMARK_MODELS.find((model) => model.id === id);
}
