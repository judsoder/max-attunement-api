# STATE — Max Attunement API

Last updated: 2026-01-23  
Owner: Jud

## What this is
A small API that powers a Custom GPT (“Max’s Assistant”) with:
- Canvas assignments + grades/performance
- Google Calendar events (real-life schedule)
- Weekly reflections stored as a Drive JSONL file

Repo: https://github.com/judsoder/max-attunement-api  
Prod base URL: https://max-attunement-api.onrender.com

## API contract (GPT Actions)
OpenAPI file: `openapi.yaml` (OpenAPI 3.1.x for GPT Actions)
Endpoints:
- `GET /health` (no auth required)
- `POST /context` (auth required) — unified context for GPT:
  - assignments[]
  - events[] (google_calendar only)
  - coursePerformance[]
  - recentPerformance[]
  - summary
- `POST /reflections/save` (auth required)
- `POST /reflections/recent` (auth required)
- `POST /reflections/cleanup` (auth required)

Auth header:
- `X-API-Key: <API_KEY>` (value stored in Render env + in GPT Actions “API Key” auth)

## Environment / secrets (DO NOT COMMIT)
Local: `.env` (gitignored)
Render: Environment Variables set in service

Required env vars (names):
- `API_KEY`
- `CANVAS_BASE_URL`
- `CANVAS_TOKEN`
- `CANVAS_STUDENT_ID`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `GOOGLE_CALENDAR_ID`
- `DRIVE_FOLDER_NAME`
- `REFLECTION_FILE_NAME`

Notes:
- After changing the GPT Actions server/schema, ChatGPT sometimes needs the API key re-saved in the Action auth UI.
- Render free tier may sleep; first request can take ~30–90s. Retry once before diagnosing.

## Time / date handling
Goal: reduce “time noise” in parent timeline output.
- Canvas assignments include `dueAt` (ISO) and `due` (display string).
- We updated Canvas mapping so `due` is **date-only** (no time-of-day), while keeping `dueAt` for sorting/debug.

Current known behavior:
- Many Canvas items still have “2:05 PM / 2:15 PM” style due times — those are Canvas “default due time” artifacts.
- For parent-friendly output, we prefer:
  - show `due` (date-only)
  - avoid printing times unless user explicitly asks for times

## What’s working now
- Local server runs (`npm run dev`)
- Render deploy is live (service reachable at base URL)
- GPT Actions can call the API and return real data
- Links: Canvas URLs and calendar join URLs are present in payload and GPT can render them as “Link › … / Join › …”
- Weekly reflections:
  - save
  - fetch recent
  - cleanup/dedupe

## Current priorities / next steps
1) **Time noise cleanup** (primary)
   - Continue stripping default times from Canvas due display
   - Ensure GPT timeline view doesn’t over-emphasize “2:05 PM / 11:59 PM” unless asked

2) **Calendar filtering** (secondary)
   - Right now we allow “Lev” events too; later add filtering by attendee/calendar name or a whitelist of calendars

3) **Grade hypotheticals safety**
   - Only compute “what if X/5 becomes 5/5” when gradebook totals exist; otherwise ask for totals

4) **Stability**
   - Consider caching `/context` for ~30–60s to reduce repeated calls
   - Add basic request logging/correlation IDs (already has Fastify logger)

## Useful test commands (no secrets here)
Health:
- `curl -i https://max-attunement-api.onrender.com/health`

Context (requires header):
- `curl -sS -X POST https://max-attunement-api.onrender.com/context -H "Content-Type: application/json" -H "X-API-Key: <API_KEY>" -d '{"text":"what does max have this week?","who":"Jud","student":"Max"}' | jq '.summary, (.assignments|length), (.events|length)`

## GPT behavior notes
- Tool-first: always call `/context` for due/schedule/grades questions.
- Never invent assignments/events/grades.
- Ask a clarifying question when required inputs are missing (especially grade hypotheticals).

