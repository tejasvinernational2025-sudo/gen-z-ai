export type ProviderName = "gemini" | "deepseek" | "openai" | "claude";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ProviderResult = {
  text: string;
  provider: ProviderName;
  model: string;
};

const GEMINI_FALLBACK_MODELS = [
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
];

function preferredProvider(): ProviderName {
  const configured = process.env.GENZ_AI_PROVIDER?.toLowerCase();

  if (configured === "gemini" && process.env.GEMINI_API_KEY) return "gemini";
  if (configured === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (configured === "claude" && process.env.ANTHROPIC_API_KEY) return "claude";
  if (configured === "deepseek" && process.env.DEEPSEEK_API_KEY) return "deepseek";

  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.DEEPSEEK_API_KEY) return "deepseek";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "claude";

  throw new Error("No AI provider API key is configured");
}

function collectGeminiText(data: any) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((part: { text?: string }) => (typeof part?.text === "string" ? part.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();
}

function geminiModelChain() {
  const primary = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  return [primary, ...GEMINI_FALLBACK_MODELS].filter(
    (model, index, models) => models.indexOf(model) === index
  );
}

function canFallbackGemini(status: number) {
  return status === 404 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

async function callGemini(system: string, messages: ChatMessage[]): Promise<ProviderResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const contents = messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));

  let lastStatus = 0;
  let lastDetail = "";

  for (const model of geminiModelChain()) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: system }],
          },
          contents,
          generationConfig: {
            maxOutputTokens: 1200,
          },
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      const text = collectGeminiText(data);
      if (!text) {
        lastStatus = 502;
        lastDetail = "Gemini returned an empty response";
        continue;
      }

      return { text, provider: "gemini", model };
    }

    lastStatus = response.status;
    lastDetail = (await response.text()).slice(0, 300);

    if (!canFallbackGemini(response.status)) {
      throw new Error(`Gemini error (${response.status}): ${lastDetail}`);
    }
  }

  throw new Error(
    `Gemini models are temporarily busy/unavailable (${lastStatus || 503}). Please try again shortly.`
  );
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

  if (provider === "gemini") return callGemini(system, messages);
  if (provider === "openai") return callOpenAI(system, messages);
  if (provider === "claude") return callClaude(system, messages);
  return callDeepSeek(system, messages);
}
