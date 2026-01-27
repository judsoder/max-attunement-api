import type { Assignment, CoursePerformance, RecentPerformance } from "./canvas.js";
import type { CalendarEvent } from "./calendar.js";
import type { StudentName, WeeklyEmail } from "./student.js";

export interface Summary {
  courses: string[];
  dueSoon: Assignment[];
  assignmentsByCourse: Record<string, Assignment[]>;
  assignmentCount: number;
  eventCount: number;
}

export interface ContextResponse {
  student: StudentName;
  studentDisplayName: string;
  canvasBaseUrl: string;
  assignments: Assignment[];
  events: CalendarEvent[];
  summary: Summary;
  coursePerformance: CoursePerformance[];
  recentPerformance: RecentPerformance[];
  // Optional: only for students with weekly email support (Lev)
  weeklyEmail?: WeeklyEmail;
}
