# Attunement Assistant API

A Fastify API server that provides unified context from Canvas LMS, Google Calendar, and Google Drive for student learning assistants. Supports multiple students with per-student Canvas tokens and calendars.

## Features

- **Multi-Student Support**: Separate configurations for each student (Max, Lev)
- **Canvas Integration**: Fetches courses, assignments (next 14 days), grades, and recent submissions
- **Google Calendar Integration**: Fetches upcoming events with meeting links
- **Weekly Email Storage**: Store and retrieve weekly teacher emails (for Lev)
- **Reflections Management**: Save, retrieve, and cleanup reflections stored in Google Drive
- **Syllabus Management**: Grade weights and policies for Max's courses
- **Authentication**: X-API-Key header validation
- **Rate Limiting**: 100 requests per minute

## Supported Students

| Student | Canvas | Calendar | Weekly Email | Syllabi |
|---------|--------|----------|--------------|---------|
| Max     | ✓      | ✓        | —            | ✓       |
| Lev     | ✓      | ✓        | ✓            | —       |

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
| `CANVAS_BASE_URL` | Canvas instance URL (shared) |
| **Max** | |
| `MAX_CANVAS_TOKEN` | Max's Canvas API token |
| `MAX_CANVAS_STUDENT_ID` | Max's Canvas student ID |
| `MAX_GOOGLE_CALENDAR_ID` | Max's Google Calendar ID |
| **Lev** | |
| `LEV_CANVAS_TOKEN` | Lev's Canvas API token |
| `LEV_CANVAS_STUDENT_ID` | Lev's Canvas student ID |
| `LEV_GOOGLE_CALENDAR_ID` | Lev's Google Calendar ID |
| **Google OAuth** | |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_REFRESH_TOKEN` | Google OAuth refresh token |
| **Optional** | |
| `DRIVE_FOLDER_NAME` | Google Drive folder for reflections |
| `REFLECTION_FILE_NAME` | Reflections file name |
| `WEEKLY_EMAIL_PATH` | Path for weekly email storage |

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
# Max (default)
curl -X POST http://localhost:3000/context \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"student":"max"}'

# Lev (includes weekly email if available)
curl -X POST http://localhost:3000/context \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"student":"lev"}'
```

### Weekly Email (Lev only)

**GET /weekly-email** - Get the most recent weekly email

```bash
curl "http://localhost:3000/weekly-email?student=lev" \
  -H "X-API-Key: your-api-key"
```

**POST /weekly-email** - Save a weekly email

```bash
curl -X POST http://localhost:3000/weekly-email \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "student": "lev",
    "weekOf": "2026-01-26",
    "subject": "This Week in Class VC: 1/26-1/30",
    "content": "Hello Class VC Parents and Students..."
  }'
```

**GET /weekly-email/history** - Get email history

```bash
curl "http://localhost:3000/weekly-email/history?student=lev&limit=5" \
  -H "X-API-Key: your-api-key"
```

### Syllabus (Max only)

**GET /syllabus** - List all syllabi with grade weights
**GET /syllabus/weights** - Just the grade weight summary
**GET /syllabus/:course** - Get a specific syllabus
**POST /syllabus/match** - Match a Canvas course name to a syllabus
**POST /syllabus/impact** - Calculate grade impact for an assignment

### Reflections

**POST /reflections/save** - Save a new reflection
**POST /reflections/recent** - Get recent reflections
**POST /reflections/cleanup** - Remove duplicate reflections

### GET /health

Health check endpoint (no authentication required).

```bash
curl http://localhost:3000/health
```

## Student Canvas Token Setup

For each student:

1. Log into Canvas with the student's account
2. Go to Account > Settings
3. Under "Approved Integrations", generate a new access token
4. Name it (e.g., "Attunement API")
5. Copy the token immediately (only shown once)
6. Find the student ID from the Canvas profile URL

## Google OAuth Setup

1. Create a project in Google Cloud Console
2. Enable Google Calendar API and Google Drive API
3. Create OAuth 2.0 credentials (Desktop app type)
4. Obtain a refresh token with scopes:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/drive`

## Deployment

Deployed on Render. When adding new environment variables, update them in the Render dashboard.

Required env vars for multi-student support:
- `MAX_CANVAS_TOKEN`, `MAX_CANVAS_STUDENT_ID`, `MAX_GOOGLE_CALENDAR_ID`
- `LEV_CANVAS_TOKEN`, `LEV_CANVAS_STUDENT_ID`, `LEV_GOOGLE_CALENDAR_ID`
