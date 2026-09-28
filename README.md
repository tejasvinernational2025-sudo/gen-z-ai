# Gen-z AI

**India-first affordable AI tutor** for students.

## Product identity
Gen-z AI is not a generic chat clone. The product is designed around Indian students, Indian languages, mobile-first access, affordable AI usage, and practical study workflows.

## MVP v0.1
- Mobile-first AI tutor
- 22 scheduled Indian languages + English + Hinglish
- Study modes: Ask AI, Explain, Notes, Quiz, Exam Prep
- Student contexts for CBSE, ICSE, State Boards, JEE, NEET, CUET, SSC, college and general study
- Groq streaming chat when configured, with a multi-provider AI layer
- Provider support for Groq / Gemini / DeepSeek / OpenAI / Claude
- Photo Solve with Gemini multimodal support
- Ask PDF with server-side text extraction
- Guest mode
- Supabase passwordless email login and private chat history
- Dedicated Gen-z AI Supabase project with hardened RLS and Data API grants
- Installable PWA foundation
- Server-side request-size/context limits
- Server-side best-effort rate limits for Chat, Photo Solve and PDF Study
- Reproducible npm lockfile + GitHub CI
- Runtime dependencies pinned and production npm audit passing at the current lockfile

## AI provider environment
Never expose provider secret keys in browser-side code.

Example development/testing variables:

```bash
GENZ_AI_PROVIDER=groq
GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-20b

# Optional fallback/provider keys
GEMINI_API_KEY=
DEEPSEEK_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

Optional provider variables are documented in `.env.example`.

## Run locally
1. Copy `.env.example` to `.env.local`
2. Add at least one server-side AI provider API key
3. `npm ci`
4. `npm run dev`

## Production launch checklist
1. Keep AI/provider keys server-side only and verify `/api/health`.
2. Verify text chat, Photo Solve and Ask PDF on the production domain.
3. Verify Google/email sign-in, save/load history and RLS end to end.
4. Persistent per-user/day quotas are already wired for signed-in users.
5. Complete Razorpay onboarding, then wire paid plan checkout + verified payment activation.
6. Finalize public support contact details and the paid-plan refund window before enabling checkout.
7. Run a final mobile smoke test across auth, chat, uploads, quotas and payment activation.
8. Curriculum retrieval, longer-PDF handling and voice upgrades can continue after the initial launch.

## Current security baseline
- Provider API keys are server-only.
- Uploaded Photo/PDF sizes and prompts are bounded.
- Chat context is bounded.
- Database tables use RLS.
- Public AI endpoints have server-side request throttling.
- Current pinned dependency tree passes the production high-severity npm audit check used during the security refresh.
