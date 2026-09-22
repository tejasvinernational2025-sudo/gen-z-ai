import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const providers = {
    gemini: Boolean(process.env.GEMINI_API_KEY),
    deepseek: Boolean(process.env.DEEPSEEK_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
    claude: Boolean(process.env.ANTHROPIC_API_KEY),
  };

  return NextResponse.json({
    ok: true,
    app: "gen-z-ai",
    positioning: "India-first affordable AI tutor",
    supabase: {
      configured: true,
      projectRef: "xnvrscevqdemnxyuvcpf",
    },
    ai: {
      configured: Object.values(providers).some(Boolean),
      preferredProvider:
        process.env.GENZ_AI_PROVIDER ||
        (providers.gemini ? "gemini" :
        providers.deepseek ? "deepseek" :
        providers.openai ? "openai" :
        providers.claude ? "claude" : null),
      providers,
    },
  });
}
