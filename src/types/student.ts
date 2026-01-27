export type StudentName = "max" | "lev";

export interface StudentConfig {
  name: StudentName;
  displayName: string;
  canvasToken: string;
  canvasStudentId: number;
  googleCalendarId: string;
  // Lev-specific: weekly teacher email support
  supportsWeeklyEmail?: boolean;
}

export interface WeeklyEmail {
  student: StudentName;
  weekOf: string; // e.g., "2026-01-26"
  subject: string;
  content: string;
  receivedAt: string;
  updatedAt: string;
}
