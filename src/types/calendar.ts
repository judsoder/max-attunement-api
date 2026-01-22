export interface CalendarEvent {
  id: string;
  title: string;
  start: string | null;
  end: string | null;
  location: string | null;
  source: "google_calendar";
  joinUrl?: string;
}
