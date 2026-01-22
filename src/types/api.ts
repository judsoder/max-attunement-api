import type { Assignment, CoursePerformance, RecentPerformance } from "./canvas.js";
import type { CalendarEvent } from "./calendar.js";

export interface Summary {
  courses: string[];
  dueSoon: Assignment[];
  assignmentsByCourse: Record<string, Assignment[]>;
  assignmentCount: number;
  eventCount: number;
}

export interface ContextResponse {
  assignments: Assignment[];
  events: CalendarEvent[];
  summary: Summary;
  coursePerformance: CoursePerformance[];
  recentPerformance: RecentPerformance[];
}
