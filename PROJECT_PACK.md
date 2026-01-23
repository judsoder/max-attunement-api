# Max Attunement Assistant — Project Pack

## What this is
A small API that powers a Custom GPT (“Max’s Assistant”) with:
- Canvas assignments + grades/performance
- Google Calendar events
- Weekly reflections saved to a Drive JSONL file

## Production URL
Base URL: https://max-attunement-api.onrender.com

## Auth
All endpoints require header:
X-API-Key: max-reflect-6f3c9b7a-2d2e-4c7b-9f11-9e2a7c3d4f5b

(Keep the key in Render env vars + GPT Action “API Key” auth.)

## Endpoints
- POST /context
- POST /reflections/save
- POST /reflections/recent
- POST /reflections/cleanup
- GET /health

## Render notes
- Service spins down on free tier → first request may take ~30–90s.
- Health check: requires X-API-Key.

## Quick cURL tests
Health:
```bash
curl -i -sS --max-time 120 \
  -H "X-API-Key: max-reflect-6f3c9b7a-2d2e-4c7b-9f11-9e2a7c3d4f5b" \
  https://max-attunement-api.onrender.com/health

