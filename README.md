# Gen-z AI

**India-first affordable AI tutor** for students.

## Product identity
Gen-z AI is not a generic chat clone. The product is designed around Indian students, Indian languages, mobile-first access, low-cost AI routing, and practical study workflows.

## MVP v0.1
- Mobile-first AI chat
- 22 scheduled Indian languages + English + Hinglish
- Study modes: Ask AI, Explain, Notes, Quiz, Exam Prep
- India-first tutoring context for CBSE, ICSE, state boards, JEE, NEET, CUET, SSC and other student use cases
- DeepSeek-first low-cost backend
- Smart provider layer for DeepSeek / OpenAI / Claude
- Photo Solve
- Ask PDF with server-side text extraction
- Guest mode
- Supabase-ready passwordless login and private chat history
- Hardened RLS schema and Data API grants
- Server-side request-size and context limits for cost control
- Reproducible npm lockfile + GitHub CI

## Run locally
1. Copy `.env.example` to `.env.local`
2. Add at least one AI provider API key
3. `npm ci`
4. `npm run dev`

## Production next steps
1. Create/connect a dedicated Supabase project
2. Apply the secure schema and configure email login redirect URLs
3. Deploy to a Next.js-compatible host
4. Add usage quotas and affordable student plans
5. Add curriculum-aware retrieval and better long-PDF study
6. Add voice and richer regional-language experiences

Never expose provider secret API keys in browser-side code.
