# Gen-z AI

India-first affordable multilingual AI study assistant.

## MVP v0.1
- Mobile-first AI chat
- 22 scheduled Indian languages + English + Hinglish
- Study modes: Ask AI, Explain, Notes, Quiz, Exam Prep
- DeepSeek-first low-cost backend
- Provider-ready env structure for OpenAI and Anthropic/Claude
- Photo Solve and Ask PDF prepared as next features

## Run locally
1. Copy `.env.example` to `.env.local`
2. Add `DEEPSEEK_API_KEY`
3. `npm install`
4. `npm run dev`

## Production plan
1. Deploy on Vercel or compatible Next.js host
2. Add Supabase Auth + chat history
3. Add image question flow
4. Add PDF/RAG study flow
5. Add usage quotas + Razorpay/UPI plans
6. Add smart model router (DeepSeek / OpenAI / Claude)

Never expose provider API keys in browser-side code.
