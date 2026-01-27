import { FastifyInstance } from "fastify";
import { getAssignmentWithExternalContent } from "../services/assignment-content.js";
import { getStudentConfig, isValidStudent } from "../config.js";
import type { StudentName } from "../types/student.js";

interface AssignmentContentRequestBody {
  courseId: number;
  assignmentId: number;
  student?: string;
}

export async function assignmentContentRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /assignment/content
   * 
   * Fetches the full content of an assignment, including:
   * - Full description (not truncated)
   * - Attached files (with parsed text content where possible)
   * - Linked quizzes or pages
   * 
   * Use this when you need to see the actual assignment materials,
   * not just the metadata from /context.
   */
  app.post<{ Body: AssignmentContentRequestBody }>("/assignment/content", async (request, reply) => {
    const { courseId, assignmentId, student: studentParam } = request.body;

    // Validate required fields
    if (!courseId || !assignmentId) {
      return reply.status(400).send({
        error: "Missing required fields: courseId and assignmentId",
      });
    }

    // Default to "max" for backwards compatibility
    const studentName: StudentName = studentParam && isValidStudent(studentParam)
      ? studentParam
      : "max";

    const studentConfig = getStudentConfig(studentName);

    try {
      const content = await getAssignmentWithExternalContent(
        courseId,
        assignmentId,
        studentConfig
      );

      return {
        student: studentName,
        ...content,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return reply.status(500).send({
        error: `Failed to fetch assignment content: ${message}`,
      });
    }
  });
}
