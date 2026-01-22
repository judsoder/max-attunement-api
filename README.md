# Max's Attunement Assistant API

A Fastify API server that provides unified context from Canvas LMS, Google Calendar, and Google Drive for the Max Attunement Assistant GPT.

## Features

- **Canvas Integration**: Fetches courses, assignments (next 7 days), grades, and recent submissions
- **Google Calendar Integration**: Fetches upcoming events with meeting links
- **Reflections Management**: Save, retrieve, and cleanup reflections stored in Google Drive
- **Authentication**: X-API-Key header validation
- **Rate Limiting**: 100 requests per minute

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3000) |
| `API_KEY` | Your API key for authentication |
| `CANVAS_BASE_URL` | Canvas instance URL |
| `CANVAS_TOKEN` | Canvas API access token |
| `CANVAS_STUDENT_ID` | Canvas student ID |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_REFRESH_TOKEN` | Google OAuth refresh token |
| `GOOGLE_CALENDAR_ID` | Google Calendar ID (email) |
| `DRIVE_FOLDER_NAME` | Google Drive folder for reflections |
| `REFLECTION_FILE_NAME` | Reflections file name |

### 3. Build and run

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## API Endpoints

### POST /context

Returns unified context including assignments, events, grades, and summaries.

```bash
curl -X POST http://localhost:3000/context \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json"
```

### POST /reflections/save

Save a new reflection.

```bash
curl -X POST http://localhost:3000/reflections/save \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"who":"Max","text":"Had a productive week","threads":["math","english"]}'
```

### POST /reflections/recent

Get recent reflections.

```bash
curl -X POST http://localhost:3000/reflections/recent \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"n":8}'
```

### POST /reflections/cleanup

Remove duplicate reflections.

```bash
curl -X POST http://localhost:3000/reflections/cleanup \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json"
```

### GET /health

Health check endpoint (no authentication required).

```bash
curl http://localhost:3000/health
```

## OpenAPI Specification

The `openapi.yaml` file contains the full API specification for use with GPT Actions or other OpenAPI-compatible tools.

## Google OAuth Setup

1. Create a project in Google Cloud Console
2. Enable Google Calendar API and Google Drive API
3. Create OAuth 2.0 credentials (Desktop app type)
4. Use the OAuth Playground or a script to obtain a refresh token with scopes:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/drive`

## Canvas API Setup

1. Log into Canvas as the student
2. Go to Account > Settings
3. Under "Approved Integrations", generate a new access token
4. Find the student ID from the user's Canvas profile URL

## Deployment

The API can be deployed to any Node.js hosting platform:

- Railway
- Render
- Fly.io
- AWS/GCP/Azure

Ensure all environment variables are configured in your deployment platform.
