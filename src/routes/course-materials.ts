import type { FastifyPluginAsync } from "fastify";
import { getStudentConfig, isValidStudent } from "../config.js";
import type { StudentName } from "../types/student.js";
import { 
  getCourseMaterials, 
  findStudyGuide,
  getPageContent,
  getCoursePages,
} from "../services/course-materials.js";
import { fetchGoogleContent, fetchAllGoogleContent } from "../utils/google-docs.js";

export const courseMaterialsRoutes: FastifyPluginAsync = async (app) => {
  /**
   * Get all materials for a course (pages, module items, external links)
   */
  app.post<{
    Body: {
      courseId: number;
      student: string;
      search?: string;
      includeContent?: boolean;
      fetchGoogleDocs?: boolean;
    };
  }>("/course/materials", async (request, reply) => {
    const { courseId, student, search, includeContent, fetchGoogleDocs } = request.body;

    if (!courseId || !student) {
      return reply.code(400).send({
        error: "BadRequest",
        message: "courseId and student are required",
      });
    }

    if (!isValidStudent(student)) {
      return reply.code(400).send({
        error: "BadRequest",
        message: `Unknown student: ${student}`,
      });
    }

    const studentName: StudentName = student;
    const studentConfig = getStudentConfig(studentName);

    const materials = await getCourseMaterials(courseId, studentConfig, {
      search,
      includeContent,
      fetchGoogleDocs: fetchGoogleDocs ?? true,
    });

    return {
      student: studentName,
      ...materials,
    };
  });

  /**
   * Find study guide materials for a course
   */
  app.post<{
    Body: {
      courseId: number;
      student: string;
      searchTerms?: string[];
    };
  }>("/course/study-guide", async (request, reply) => {
    const { courseId, student, searchTerms } = request.body;

    if (!courseId || !student) {
      return reply.code(400).send({
        error: "BadRequest",
        message: "courseId and student are required",
      });
    }

    if (!isValidStudent(student)) {
      return reply.code(400).send({
        error: "BadRequest",
        message: `Unknown student: ${student}`,
      });
    }

    const studentName: StudentName = student;
    const studentConfig = getStudentConfig(studentName);

    const studyGuides = await findStudyGuide(
      courseId,
      studentConfig,
      searchTerms
    );

    return {
      student: studentName,
      courseId,
      studyGuides,
    };
  });

  /**
   * Get a specific page's content
   */
  app.post<{
    Body: {
      courseId: number;
      pageUrl: string;
      student: string;
    };
  }>("/course/page", async (request, reply) => {
    const { courseId, pageUrl, student } = request.body;

    if (!courseId || !pageUrl || !student) {
      return reply.code(400).send({
        error: "BadRequest",
        message: "courseId, pageUrl, and student are required",
      });
    }

    if (!isValidStudent(student)) {
      return reply.code(400).send({
        error: "BadRequest",
        message: `Unknown student: ${student}`,
      });
    }

    const studentName: StudentName = student;
    const studentConfig = getStudentConfig(studentName);

    const page = await getPageContent(courseId, pageUrl, studentConfig);

    return {
      student: studentName,
      courseId,
      page: {
        id: page.page_id,
        title: page.title,
        url: page.html_url,
        content: page.body,
        updatedAt: page.updated_at,
      },
    };
  });

  /**
   * List all pages for a course
   */
  app.post<{
    Body: {
      courseId: number;
      student: string;
    };
  }>("/course/pages", async (request, reply) => {
    const { courseId, student } = request.body;

    if (!courseId || !student) {
      return reply.code(400).send({
        error: "BadRequest",
        message: "courseId and student are required",
      });
    }

    if (!isValidStudent(student)) {
      return reply.code(400).send({
        error: "BadRequest",
        message: `Unknown student: ${student}`,
      });
    }

    const studentName: StudentName = student;
    const studentConfig = getStudentConfig(studentName);

    const pages = await getCoursePages(courseId, studentConfig);

    return {
      student: studentName,
      courseId,
      pages: pages.map(p => ({
        id: p.page_id,
        title: p.title,
        urlSlug: p.url,
        url: p.html_url,
        updatedAt: p.updated_at,
        frontPage: p.front_page,
      })),
    };
  });

  /**
   * Fetch content from a Google Doc/Sheet/PDF URL
   */
  app.post<{
    Body: {
      url: string;
    };
  }>("/google-doc", async (request, reply) => {
    const { url } = request.body;

    if (!url) {
      return reply.code(400).send({
        error: "BadRequest",
        message: "url is required",
      });
    }

    const result = await fetchGoogleContent(url);
    return result;
  });

  /**
   * Fetch content from multiple Google Doc URLs
   */
  app.post<{
    Body: {
      urls?: string[];
      html?: string;
    };
  }>("/google-docs", async (request, reply) => {
    const { urls, html } = request.body;

    if (!urls && !html) {
      return reply.code(400).send({
        error: "BadRequest",
        message: "Either urls array or html with embedded links is required",
      });
    }

    if (html) {
      const results = await fetchAllGoogleContent(html);
      return { documents: results };
    }

    if (urls) {
      const results = await Promise.all(urls.map(fetchGoogleContent));
      return { documents: results };
    }
  });
};
