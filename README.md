# Gen-z AI

**India-first affordable AI tutor** for students.

## Product identity
Gen-z AI is not a generic chat clone. The product is designed around Indian students, Indian languages, mobile-first access, affordable AI usage, and practical study workflows.

## MVP v0.1
- Mobile-first AI tutor
- 22 scheduled Indian languages + English + Hinglish
- Study modes: Ask AI, Explain, Notes, Quiz, Exam Prep
- Student contexts for CBSE, ICSE, State Boards, JEE, NEET, CUET, SSC, college and general study
- Gemini 3.8 Flash as the primary provider
- Smart provider layer for Gemini / DeepSeek / OpenAI / Claude
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

Primary development/testing variables:

```bash
GENZ_AI_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.8-flash
```

Optional provider variables are documented in `.env.example`.

## Run locally
1. Copy `.env.example` to `.env.local`
2. Add at least one server-side AI provider API key
3. `npm ci`
4. `npm run dev`

## Production next steps
1. Deploy to a Next.js-compatible host.
2. Add `GEMINI_API_KEY` as a host-side secret and keep it out of GitHub/browser code.
3. Verify `/api/health`, text chat, Photo Solve and Ask PDF on the deployed URL.
4. Set the deployed URL as the Supabase Auth Site URL / allowed redirect URL.
5. Test magic-link sign-in, save/load history and RLS end to end.
6. Replace the best-effort instance limiter with persistent per-user/day quotas before broad public rollout.
7. Add student plans/payments only after usage metering is verified.
8. Add curriculum-aware retrieval, better long-PDF chunking and voice/regional-language upgrades.

## Current security baseline
- Provider API keys are server-only.
- Uploaded Photo/PDF sizes and prompts are bounded.
- Chat context is bounded.
- Database tables use RLS.
- Public AI endpoints have server-side request throttling.
- Current pinned dependency tree passes the production high-severity npm audit check used during the security refresh.
