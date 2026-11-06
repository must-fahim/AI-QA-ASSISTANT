# AI QA Assistant

Generate structured software test cases from requirements, user stories, Jira tickets, and feature specifications. Review and edit the cases, save them in Supabase, and export them to CSV.

## Requirements

- Node.js 20.18 or newer. Node.js 20.19+ is recommended because some dependencies load ES modules from CommonJS.
- npm

## Install

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`. Do not commit it.

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The home page redirects to the dashboard.

## Production build

```bash
npm run build
npm start
```

## Checks

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

`npm test` runs Vitest. On Node.js 20.18 the test script enables `--experimental-require-module` so Vitest can load its ESM dependencies.

## AI configuration

The server calls an OpenAI-compatible chat completions endpoint. Keys stay on the server.

```bash
AI_API_KEY=
AI_MODEL=gpt-4o-mini
AI_BASE_URL=https://api.openai.com/v1
AI_JSON_MODE=true
```

Set `AI_JSON_MODE=false` when the provider does not support `response_format: json_object`. Restart the dev server after changing environment variables. The settings page shows whether a key and model are set, plus the model name and endpoint host. It never shows the key.

Without `AI_API_KEY` and `AI_MODEL`, `POST /api/generate` returns `503 AI_NOT_CONFIGURED`. The app does not invent test cases in place of the model. The “View sample output” action shows predefined examples and labels them as samples.

## Supabase configuration

1. Create a Supabase project.
2. In the SQL editor, run `supabase/migrations/001_init.sql`.
3. Set the server environment:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Use the service role key only on the server. Do not prefix it with `NEXT_PUBLIC_`. The migration enables Row Level Security and revokes access from the `anon` and `authenticated` roles. The service role bypasses RLS and is the only role this MVP uses. There is no end-user login.

Until those variables are set and the migration has been applied, dashboard statistics stay unavailable and saving a suite returns `503 DATABASE_NOT_CONFIGURED`. Generated cases can still be reviewed and exported in the current browser session.

## API

All responses use `{ data }` on success and `{ error: { code, message, details? } }` on failure.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/generate` | Validate a requirement and ask the configured model for test cases. Does not save them. Rate limited per IP. |
| `GET` | `/api/status` | AI and database configuration status. No secrets. |
| `GET` | `/api/test-suites` | List saved suites and statistics from the database. |
| `POST` | `/api/test-suites` | Save a generated suite and its cases. |
| `GET` | `/api/test-suites/:id` | Read one suite with its cases. |
| `PUT` | `/api/test-suites/:id` | Update suite title, requirement, Jira id, summary, assumptions, or questions. |
| `DELETE` | `/api/test-suites/:id` | Delete a suite and its cases. |
| `PATCH` | `/api/test-cases/:id` | Update one saved test case. |
| `DELETE` | `/api/test-cases/:id` | Delete one saved test case. |

`:id` values are UUIDs. Generation is limited to 20 test cases and 20,000 characters of requirement text.

## CSV export

The results table can export all cases, the selected rows, or the rows matching the current search and filters. Exports are UTF-8, quote fields that contain commas or line breaks, and prefix cells that could be interpreted as spreadsheet formulas.

## Limitations

- AI generation and database persistence need the environment variables above. They were not exercised against a live provider or Supabase project in this workspace.
- There is no user authentication. Anyone who can reach the server can call the API.
- The generation rate limit is in memory and resets when the server process restarts.
- Browser generation defaults are stored in local storage, not in the database.
- Cache Components is turned off because Ant Design’s server render is not deterministic under that prerender mode.
