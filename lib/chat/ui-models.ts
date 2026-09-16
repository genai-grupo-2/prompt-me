export const CHAT_MODELS = [
  {
    id: "openai/gpt-5.6-luna",
    name: "GPT 5.6 Luna",
    provider: "OpenAI",
    initial: "O",
    description: "Razonamiento a tu medida",
    color: "mint",
  },
  {
    id: "anthropic/claude-haiku-4.5",
    name: "Claude Haiku 4.5",
    provider: "Anthropic",
    initial: "A",
    description: "Ideas claras, respuestas ágiles",
    color: "peach",
  },
  {
    id: "google/gemini-3.7-flash",
    name: "Gemini 3.7 Flash",
    provider: "Google",
    initial: "G",
    description: "Una nueva perspectiva",
    color: "blue",
  },
  {
    id: "deepseek/deepseek-v4-flash-0731",
    name: "DeepSeek V4 Flash",
    provider: "DeepSeek",
    initial: "D",
    description: "Explorá más, gastá menos",
    color: "lavender",
  },
] as const;

export type ModelId = (typeof CHAT_MODELS)[number]["id"];
export function getModel(id: string) {
  return CHAT_MODELS.find((model) => model.id === id) ?? CHAT_MODELS[0];
}
