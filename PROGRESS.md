# AI QA Assistant — progress checkpoint

Saved before a computer restart. No further implementation was started after this note.

Branch: `setup-qa-assistant`  
Last commit: `ea3a82a` Initial commit  
These scaffold changes are **not committed**.

## 1. Completed

Phase 1 is only partly done. The Next.js app was initialized in this folder and dependencies were installed. No product features have been built.

- Inspected the workspace. It contained only `README.md` and an existing `.git` directory.
- Initialized Next.js **16.4.5** in the current directory (App Router, TypeScript, Tailwind CSS v4, ESLint, `src/`, import alias `@/*`, npm).
  - `create-next-app` cannot use the folder name `AI-QA-ASSISTANT` as an npm package name (capital letters).
  - The app was scaffolded in a temporary `ai-qa-assistant/` directory, the nested `.git` was removed, and the files were moved up into this repo. Package name is `ai-qa-assistant`.
- Confirmed TypeScript `strict` is already enabled in `tsconfig.json`.
- Installed runtime dependencies:
  - `antd` 6.7.0
  - `@ant-design/nextjs-registry` 1.3.0
  - `lucide-react` 1.69.0
  - `react-hook-form` 7.91.0
  - `yup` 1.7.1
  - `@hookform/resolvers` 7.0.3
  - `zod` 4.6.7
  - `@supabase/supabase-js` 2.109.0
- Installed dev dependency: `vitest` 4.1.12.
- Read the local Next.js 16 docs for route handlers and Cache Components (`cacheComponents` and `partialPrefetching` are already on in `next.config.ts`).
- Checked library APIs that the next session will need:
  - Zod 4: `z.uuid()` and `ZodError.issues` work. `z.string().uuid()` is deprecated.
  - Ant Design still ships `antd/dist/reset.css` and `@ant-design/nextjs-registry` exports `AntdRegistry`.
  - Lucide named icons used in the planned sidebar (`LayoutDashboard`, `Sparkles`, `History`, `Settings`) exist.

The default Create Next App page is still the only UI. `src/app/page.tsx` and `src/app/layout.tsx` are untouched starter files.

## 2. Files created or modified

### Modified

- `README.md` — Create Next App replaced the original one-line README (`it wil be save QA time to generate test cases`). The original text is no longer in the file.

### Created by scaffolding and dependency install

- `.gitignore`
- `AGENTS.md` (Next.js agent note; do not treat it as product docs)
- `eslint.config.mjs`
- `next.config.ts`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `next-env.d.ts` (gitignored by the generated `.gitignore`)
- `public/file.svg`
- `public/globe.svg`
- `public/next.svg`
- `public/vercel.svg`
- `public/window.svg`
- `src/app/favicon.ico`
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `node_modules/` (installed, not source)
- `.next/` (dev cache from a failed `yarn dev`, not source)

### Created by this checkpoint

- `PROGRESS.md`

Not created yet: application source under `src/components`, `src/services`, `src/repositories`, `src/app/api`, `src/app/dashboard`, migrations, `.env.example`, tests, or a `test` npm script.

## 3. Remaining tasks

Resume in this order. Do not substitute mock AI or mock database data.

1. Fix the development server (see blocker below) and confirm `npm run dev` serves the starter page.
2. Add `"test": "vitest run"` when tests are added. Vitest is installed, but `package.json` has no test script.
3. Replace the starter UI with the app shell: sidebar (Dashboard, Generate Test Cases, Test History, Settings), header, Ant Design theme color `#712DC8`, Tailwind layout.
4. Build Dashboard, Generate, History, and Settings pages.
5. Requirement form (React Hook Form + Yup), three examples, and clearly labeled sample output.
6. Server-side AI service (`services/ai`), prompts, Zod response validation, and `POST /api/generate`.
7. Results table, drawer editor, and CSV export (formula-injection safe).
8. Supabase migrations for `test_suites` and `test_cases`, repositories, and the specified CRUD routes.
9. History and settings backed by real configuration status. Never send API secrets to the browser.
10. Tests for validation, AI response parsing, generation service, API routes, repositories, CSV, and test-case editing.
11. Run `npm run lint`, `npx tsc --noEmit`, `npm test`, and `npm run build`. Fix failures.
12. Verify the UI in the browser.
13. Replace the starter README with setup, Supabase, AI, API, and limitation notes.

### Planned architecture (not implemented)

- Interactive pages as client components so Cache Components does not block on database reads during prerender. Route handlers should touch the request so GET handlers stay dynamic.
- AI via an OpenAI-compatible chat completions API. Required env: `AI_API_KEY`, `AI_MODEL`. Optional `AI_BASE_URL` (default `https://api.openai.com/v1`) so the provider stays configurable. Keys stay server-side.
- Database via `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` on the server only. RLS enabled with no anon policies. If credentials are missing, return a clear 503 and do not fake saved suites.
- Generate returns AI JSON. Persistence is a separate `POST /api/test-suites`. Generation duration can live inside the `configuration` JSON so the specified columns stay intact.
- Form validation with Yup. Request and AI payload validation with Zod.
- In-memory per-process rate limit on generation.
- Stats come from stored suites. If the database is not configured, show an unavailable state, not zeros.

## 4. Errors, blockers, and pending decisions

### Blocker: dev server returns 500

`yarn dev` is running in the project terminal and `GET /` fails while compiling `src/app/globals.css`:

```text
Error: require() of ES Module .../node_modules/magic-string/dist/index.mjs not supported.
(from .../node_modules/@tailwindcss/turbopack/dist/index.js)
```

`next.config.ts` sends `*.css` through `@tailwindcss/turbopack`. That loader is part of the Create Next App Tailwind v4 template. The app was installed with **npm** (`package-lock.json`). There is no `yarn.lock`. The dev server was started with Yarn.

Next session should reproduce with `npm run dev` before changing config. If it still fails, fix the Tailwind/Turbopack CSS pipeline before building UI. Do not ignore this and stack application code on a broken starter.

### Environment warning

Node is `v20.18.1`. `eslint-visitor-keys@5.0.1` wants `^20.19.0 || ^22.13.0 || >=24`. npm printed `EBADENGINE`. Install succeeded. Lint and build have not been run, so this may still fail later.

### Credentials

No `.env` and no AI or Supabase credentials. Generation and database persistence cannot be proven until those are set. The integration must stay real and report when it is not configured.

### Decisions already settled

- Package manager for this repo: **npm** (matches the requested setup and the existing lockfile).
- Do not create a nested project directory.
- Do not commit secrets. `.gitignore` currently ignores `.env*`, so `.env.example` will need an exception when it is added.
- No user authentication in this MVP. Authorization is service-role-only server access plus RLS that denies anon/authenticated.

### Decisions still open

- None required to continue. Optional `AI_BASE_URL` was chosen so non-OpenAI compatible gateways work without a second client. Change it only if a specific provider is required.

## 5. How to resume

```bash
cd /Users/fahimahmed/Developments/NextJs/AI-QA-ASSISTANT
npm install
npm run dev
```

Stop the existing `yarn dev` process first if port 3000 is still taken. Continue from remaining task 1. Do not claim the QA workflow, AI generation, or database persistence works until those pieces exist and have been exercised.
