# AI QA Assistant — progress checkpoint

The application is built in this folder. Do not scaffold again.

Branch: `setup-qa-assistant`  
Last commit: `ea3a82a` Initial commit  
Application changes are **not committed**.

## Completed

- Next.js 16.4.5 app in this directory (App Router, TypeScript strict, Tailwind CSS v4, ESLint, `src/`, `@/*`, npm). Package name is `ai-qa-assistant`.
- Dev server runs with `npm run dev`. `magic-string` is pinned to `0.30.21` because Node 20.18.1 cannot `require()` the ESM build used by `@tailwindcss/turbopack`.
- `cacheComponents` and `partialPrefetching` are off. Ant Design style ids are non-deterministic during server render.
- App shell, Dashboard, Generate, History, History detail, and Settings.
- Requirement form (React Hook Form + Yup), three examples that fill the form only, and labeled sample output.
- Server AI service, Zod response validation, and `POST /api/generate`. Missing `AI_API_KEY` / `AI_MODEL` returns 503.
- Supabase migration, repositories, and suite/case CRUD routes. Missing database credentials return 503. Stats show an em dash, not zeros.
- Results table, drawer editor, and formula-safe CSV export.
- Tests, lint, and production build passed in the previous session (`npm test` 18 passed, `npm run lint` clean, `npm run build` exit 0).
- Browser check: dashboard empty state, sidebar navigation, example fill, sample-output banner, generate-without-key error, history empty state, settings status with no secrets. Narrow layouts use a header menu button so the page title is not covered.

## Still needs credentials

No `.env.local`. Live model generation and database persistence have not been exercised.

1. Copy `.env.example` to `.env.local`.
2. Set `AI_API_KEY` and `AI_MODEL`. Optional: `AI_BASE_URL`.
3. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
4. Run `supabase/migrations/001_init.sql` in the Supabase SQL editor.
5. Restart `npm run dev`, generate a suite, save it, and confirm it appears in History.

## How to resume

```bash
cd /Users/fahimahmed/Developments/NextJs/AI-QA-ASSISTANT
npm install
npm run dev
```

Open http://localhost:3000/dashboard. Use npm, not yarn.
