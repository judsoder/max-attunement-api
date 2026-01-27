import { FastifyInstance } from "fastify";
import { getAllAssignments } from "../services/canvas.js";
import { getCalendarEvents } from "../services/calendar.js";
import { getWeeklyEmail } from "../services/weekly-email.js";
import { config, getStudentConfig, isValidStudent } from "../config.js";
import type { StudentName } from "../types/student.js";
import type { Assignment } from "../types/canvas.js";
import type { ContextResponse, Summary } from "../types/api.js";

interface ContextRequestBody {
  text?: string;
  who?: string;
  student?: string;
}

function buildSummary(assignments: Assignment[], eventCount: number): Summary {
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
  app.post<{ Body: ContextRequestBody }>("/context", async (request, reply) => {
    const { student: studentParam } = request.body;

    // Default to "max" for backwards compatibility
    const studentName: StudentName = (studentParam && isValidStudent(studentParam))
      ? studentParam
      : "max";

    const studentConfig = getStudentConfig(studentName);

    // Fetch Canvas data and Calendar events in parallel
    const [canvasData, events] = await Promise.all([
      getAllAssignments(studentConfig),
      getCalendarEvents(studentConfig),
    ]);

    const { assignments, coursePerformance, recentPerformance } = canvasData;
    const summary = buildSummary(assignments, events.length);

    // Build response
    const response: ContextResponse = {
      student: studentName,
      studentDisplayName: studentConfig.displayName,
      canvasBaseUrl: config.canvasBaseUrl,
      assignments,
      events,
      summary,
      coursePerformance,
      recentPerformance,
    };

    // Include weekly email for students that support it (e.g., Lev)
    if (studentConfig.supportsWeeklyEmail) {
      const weeklyEmail = await getWeeklyEmail(studentName);
      if (weeklyEmail) {
        (response as ContextResponse & { weeklyEmail?: typeof weeklyEmail }).weeklyEmail = weeklyEmail;
      }
    }

    return response;
  });
}
