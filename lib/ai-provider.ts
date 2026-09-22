export type ProviderName = "deepseek" | "openai" | "claude";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ProviderResult = {
  text: string;
  provider: ProviderName;
  model: string;
};

function preferredProvider(): ProviderName {
  const configured = process.env.GENZ_AI_PROVIDER?.toLowerCase();

  if (configured === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (configured === "claude" && process.env.ANTHROPIC_API_KEY) return "claude";
  if (configured === "deepseek" && process.env.DEEPSEEK_API_KEY) return "deepseek";

  if (process.env.DEEPSEEK_API_KEY) return "deepseek";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "claude";

  throw new Error("No AI provider API key is configured");
}

async function callDeepSeek(system: string, messages: ChatMessage[]): Promise<ProviderResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not configured");

  const model = process.env.DEEPSEEK_MODEL || "deepseek-flash";
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, ...messages],
      max_tokens: 1200,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`DeepSeek error (${response.status}): ${detail.slice(0, 300)}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("DeepSeek returned an empty response");

  return { text, provider: "deepseek", model };
}

async function callOpenAI(system: string, messages: ChatMessage[]): Promise<ProviderResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  if (!model) throw new Error("OPENAI_MODEL is not configured");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI error (${response.status}): ${detail.slice(0, 300)}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenAI returned an empty response");

  return { text, provider: "openai", model };
}

async function callClaude(system: string, messages: ChatMessage[]): Promise<ProviderResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");
  if (!model) throw new Error("ANTHROPIC_MODEL is not configured");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1200,
      system,
      messages,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Claude error (${response.status}): ${detail.slice(0, 300)}`);
  }

  const data = await response.json();
  const text = data?.content?.find((item: { type?: string; text?: string }) => item?.type === "text")?.text;
  if (!text) throw new Error("Claude returned an empty response");

  return { text, provider: "claude", model };
}

export async function callAI(system: string, messages: ChatMessage[]) {
  const provider = preferredProvider();

  if (provider === "openai") return callOpenAI(system, messages);
  if (provider === "claude") return callClaude(system, messages);
  return callDeepSeek(system, messages);
}
