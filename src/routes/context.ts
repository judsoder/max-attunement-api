import { FastifyInstance } from "fastify";
import { getAllAssignments } from "../services/canvas.js";
import { getCalendarEvents } from "../services/calendar.js";
import { config } from "../config.js";
import type { Assignment } from "../types/canvas.js";
import type { ContextResponse, Summary } from "../types/api.js";

function buildSummary(
  assignments: Assignment[],
  eventCount: number
): Summary {
  // Get unique sorted course names
  const courseSet = new Set(assignments.map((a) => a.courseName));
  const courses = Array.from(courseSet).sort();

  // Top 10 due soonest
  const dueSoon = assignments.slice(0, 10);

  // Group by course
  const assignmentsByCourse: Record<string, Assignment[]> = {};
  for (const assignment of assignments) {
    if (!assignmentsByCourse[assignment.courseName]) {
      assignmentsByCourse[assignment.courseName] = [];
    }
    assignmentsByCourse[assignment.courseName].push(assignment);
  }

  return {
    courses,
    dueSoon,
    assignmentsByCourse,
    assignmentCount: assignments.length,
    eventCount,
  };
}

export async function contextRoutes(app: FastifyInstance): Promise<void> {
  app.post("/context", async (request, reply) => {
    // Fetch Canvas data and Calendar events in parallel
    const [canvasData, events] = await Promise.all([
      getAllAssignments(),
      getCalendarEvents(),
    ]);

    const { assignments, coursePerformance, recentPerformance } = canvasData;

    const summary = buildSummary(assignments, events.length);

    const response: ContextResponse = {
      canvasBaseUrl: config.canvasBaseUrl,
      assignments,
      events,
      summary,
      coursePerformance,
      recentPerformance,
    };

    return response;
  });
}
