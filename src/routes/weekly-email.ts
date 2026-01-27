import { FastifyInstance } from "fastify";
import {
  getWeeklyEmail,
  getWeeklyEmailForWeek,
  saveWeeklyEmail,
  getWeeklyEmailHistory,
} from "../services/weekly-email.js";
import { isValidStudent, getStudentConfig } from "../config.js";
import type { StudentName, WeeklyEmail } from "../types/student.js";

interface GetWeeklyEmailQuery {
  student: string;
  weekOf?: string;
}

interface SaveWeeklyEmailBody {
  student: string;
  weekOf: string;
  subject: string;
  content: string;
  receivedAt?: string;
}

interface GetHistoryQuery {
  student: string;
  limit?: number;
}

export async function weeklyEmailRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /weekly-email
   * Get the most recent weekly email for a student (or a specific week)
   */
  app.get<{ Querystring: GetWeeklyEmailQuery }>("/weekly-email", async (request, reply) => {
    const { student, weekOf } = request.query;

    if (!student || !isValidStudent(student)) {
      return reply.code(400).send({
        error: "BadRequest",
        message: "Invalid or missing student parameter. Use 'max' or 'lev'.",
      });
    }

    const studentConfig = getStudentConfig(student);
    if (!studentConfig.supportsWeeklyEmail) {
      return reply.code(400).send({
        error: "BadRequest",
        message: `Weekly email is not supported for student: ${student}`,
      });
    }

    const email = weekOf
      ? await getWeeklyEmailForWeek(student, weekOf)
      : await getWeeklyEmail(student);

    if (!email) {
      return reply.code(404).send({
        error: "NotFound",
        message: weekOf
          ? `No weekly email found for ${student} week of ${weekOf}`
          : `No weekly email found for ${student}`,
      });
    }

    return email;
  });

  /**
   * POST /weekly-email
   * Save or update a weekly email
   */
  app.post<{ Body: SaveWeeklyEmailBody }>("/weekly-email", async (request, reply) => {
    const { student, weekOf, subject, content, receivedAt } = request.body;

    if (!student || !isValidStudent(student)) {
      return reply.code(400).send({
        error: "BadRequest",
        message: "Invalid or missing student parameter. Use 'max' or 'lev'.",
      });
    }

    const studentConfig = getStudentConfig(student);
    if (!studentConfig.supportsWeeklyEmail) {
      return reply.code(400).send({
        error: "BadRequest",
        message: `Weekly email is not supported for student: ${student}`,
      });
    }

    if (!weekOf || !subject || !content) {
      return reply.code(400).send({
        error: "BadRequest",
        message: "Missing required fields: weekOf, subject, content",
      });
    }

    const email = await saveWeeklyEmail({
      student: student as StudentName,
      weekOf,
      subject,
      content,
      receivedAt: receivedAt ?? new Date().toISOString(),
    });

    return reply.code(201).send(email);
  });

  /**
   * GET /weekly-email/history
   * Get historical weekly emails for a student
   */
  app.get<{ Querystring: GetHistoryQuery }>("/weekly-email/history", async (request, reply) => {
    const { student, limit } = request.query;

    if (!student || !isValidStudent(student)) {
      return reply.code(400).send({
        error: "BadRequest",
        message: "Invalid or missing student parameter. Use 'max' or 'lev'.",
      });
    }

    const studentConfig = getStudentConfig(student);
    if (!studentConfig.supportsWeeklyEmail) {
      return reply.code(400).send({
        error: "BadRequest",
        message: `Weekly email is not supported for student: ${student}`,
      });
    }

    const emails = await getWeeklyEmailHistory(student, limit ?? 10);
    return { student, emails };
  });
}
