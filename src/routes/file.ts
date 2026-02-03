import { FastifyInstance } from "fastify";
import { config, getStudentConfig, isValidStudent } from "../config.js";
import type { StudentName } from "../types/student.js";

interface FileRequestBody {
  courseId: number;
  fileId: number;
  student?: string;
}

interface CanvasFile {
  id: number;
  display_name: string;
  filename: string;
  url: string;
  size: number;
  "content-type": string;
  created_at: string;
  updated_at: string;
}

export async function fileRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /file
   * 
   * Downloads a Canvas file and returns its content.
   * For text files, returns the text directly.
   * For binary files (like PDFs), returns base64-encoded content.
   */
  app.post<{ Body: FileRequestBody }>("/file", async (request, reply) => {
    const { courseId, fileId, student: studentParam } = request.body;

    if (!courseId || !fileId) {
      return reply.status(400).send({
        error: "Missing required fields: courseId and fileId",
      });
    }

    const studentName: StudentName = studentParam && isValidStudent(studentParam)
      ? studentParam
      : "max";

    const studentConfig = getStudentConfig(studentName);

    try {
      // First, get file metadata
      const metaUrl = `${config.canvasBaseUrl}/api/v1/courses/${courseId}/files/${fileId}`;
      const metaResponse = await fetch(metaUrl, {
        headers: {
          Authorization: `Bearer ${studentConfig.canvasToken}`,
        },
      });

      if (!metaResponse.ok) {
        return reply.status(metaResponse.status).send({
          error: `Canvas API error: ${metaResponse.status} ${metaResponse.statusText}`,
        });
      }

      const fileMeta = await metaResponse.json() as CanvasFile;

      // Download the actual file content
      const fileResponse = await fetch(fileMeta.url, {
        headers: {
          Authorization: `Bearer ${studentConfig.canvasToken}`,
        },
      });

      if (!fileResponse.ok) {
        return reply.status(fileResponse.status).send({
          error: `Failed to download file: ${fileResponse.status}`,
        });
      }

      const contentType = fileMeta["content-type"];
      const isText = contentType.startsWith("text/") || 
                     contentType.includes("json") ||
                     contentType.includes("javascript");

      if (isText) {
        const text = await fileResponse.text();
        return {
          student: studentName,
          file: {
            id: fileMeta.id,
            name: fileMeta.display_name,
            filename: fileMeta.filename,
            contentType,
            size: fileMeta.size,
          },
          encoding: "text",
          content: text,
        };
      } else {
        // Binary file - return as base64
        const buffer = await fileResponse.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        return {
          student: studentName,
          file: {
            id: fileMeta.id,
            name: fileMeta.display_name,
            filename: fileMeta.filename,
            contentType,
            size: fileMeta.size,
          },
          encoding: "base64",
          content: base64,
        };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return reply.status(500).send({
        error: `Failed to fetch file: ${message}`,
      });
    }
  });

  /**
   * POST /file/list
   * 
   * Lists all files in a course folder or all course files.
   */
  app.post<{ Body: { courseId: number; folderId?: number; student?: string } }>("/file/list", async (request, reply) => {
    const { courseId, folderId, student: studentParam } = request.body;

    if (!courseId) {
      return reply.status(400).send({
        error: "Missing required field: courseId",
      });
    }

    const studentName: StudentName = studentParam && isValidStudent(studentParam)
      ? studentParam
      : "max";

    const studentConfig = getStudentConfig(studentName);

    try {
      const path = folderId 
        ? `/api/v1/folders/${folderId}/files?per_page=100`
        : `/api/v1/courses/${courseId}/files?per_page=100`;
      
      const url = `${config.canvasBaseUrl}${path}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${studentConfig.canvasToken}`,
        },
      });

      if (!response.ok) {
        return reply.status(response.status).send({
          error: `Canvas API error: ${response.status} ${response.statusText}`,
        });
      }

      const files = await response.json() as CanvasFile[];

      return {
        student: studentName,
        courseId,
        folderId: folderId ?? null,
        files: files.map(f => ({
          id: f.id,
          name: f.display_name,
          filename: f.filename,
          contentType: f["content-type"],
          size: f.size,
          updatedAt: f.updated_at,
        })),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return reply.status(500).send({
        error: `Failed to list files: ${message}`,
      });
    }
  });
}
