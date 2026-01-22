import { google } from "googleapis";
import { config } from "../config.js";
import { getDateRange } from "../utils/date.js";
import type { CalendarEvent } from "../types/calendar.js";

const DAYS_AHEAD = 7;

function getOAuth2Client() {
  const oauth2Client = new google.auth.OAuth2(
    config.googleClientId,
    config.googleClientSecret
  );

  oauth2Client.setCredentials({
    refresh_token: config.googleRefreshToken,
  });

  return oauth2Client;
}

export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  const auth = getOAuth2Client();
  const calendar = google.calendar({ version: "v3", auth });

  const { start, end } = getDateRange(DAYS_AHEAD);

  const response = await calendar.events.list({
    calendarId: config.googleCalendarId,
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 50,
  });

  const events = response.data.items ?? [];

  return events.map((event): CalendarEvent => {
    // Extract meeting link from conference data or description
    let joinUrl: string | undefined;
    if (event.conferenceData?.entryPoints) {
      const videoEntry = event.conferenceData.entryPoints.find(
        (ep) => ep.entryPointType === "video"
      );
      joinUrl = videoEntry?.uri ?? undefined;
    } else if (event.hangoutLink) {
      joinUrl = event.hangoutLink;
    }

    return {
      id: event.id ?? "",
      title: event.summary ?? "Untitled Event",
      start: event.start?.dateTime ?? event.start?.date ?? null,
      end: event.end?.dateTime ?? event.end?.date ?? null,
      location: event.location ?? null,
      source: "google_calendar",
      ...(joinUrl && { joinUrl }),
    };
  });
}
