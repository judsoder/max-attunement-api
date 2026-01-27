import { config } from "../config.js";
import { stripHtml } from "../utils/html.js";
import { fetchAllGoogleContent } from "../utils/google-docs.js";
import type { StudentConfig } from "../types/student.js";

// Canvas file attachment structure
interface CanvasFile {
  id: number;
  display_name: string;
  filename: string;
  url: string; // Direct download URL
  size: number;
  "content-type": string;
}

// Full assignment response from Canvas
interface CanvasAssignmentFull {
  id: number;
  name: string;
  description: string | null;
  due_at: string | null;
  points_possible: number;
  html_url: string;
  attachments?: CanvasFile[];
  submission_types: string[];
}

export interface AssignmentContent {
  assignmentId: number;
  courseId: number;
  name: string;
  description: string | null;
  descriptionText: string | null; // HTML stripped
  dueAt: string | null;
  points: number;
  url: string;
  attachments: Array<{
    id: number;
    name: string;
    contentType: string;
    size: number;
    content?: string; // Parsed text content (for supported types)
    error?: string; // If we couldn't parse it
  }>;
  googleDocs?: Array<{
    url: string;
    type: "doc" | "spreadsheet" | "pdf" | "unknown";
    content?: string;
    error?: string;
  }>;
}

async function canvasFetch<T>(path: string, studentConfig: StudentConfig): Promise<T> {
  const url = `${config.canvasBaseUrl}${path}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${studentConfig.canvasToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Canvas API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

async function fetchFileContent(file: CanvasFile, studentConfig: StudentConfig): Promise<string | null> {
  // Only handle text-based files for now
  const textTypes = [
    "text/plain",
    "text/html",
    "text/markdown",
    "application/json",
  ];

  // For PDFs, we'd need pdf-parse - mark as TODO
  if (file["content-type"] === "application/pdf") {
    return `[PDF file: ${file.display_name} - PDF parsing not yet implemented. Upload to chat for analysis.]`;
  }

  // For Google Docs links, they're usually external
  if (file["content-type"].includes("google")) {
    return `[Google Doc: ${file.display_name} - External document, open in browser]`;
  }

  // Text files we can fetch directly
  if (textTypes.some((t) => file["content-type"].includes(t))) {
    try {
      const response = await fetch(file.url, {
        headers: {
          Authorization: `Bearer ${studentConfig.canvasToken}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      const text = await response.text();
      // Limit size to avoid huge responses
      return text.slice(0, 10000);
    } catch {
      return null;
    }
  }

  return null;
}

export async function getAssignmentContent(
  courseId: number,
  assignmentId: number,
  studentConfig: StudentConfig
): Promise<AssignmentContent> {
  // Fetch full assignment details including attachments
  const assignment = await canvasFetch<CanvasAssignmentFull>(
    `/api/v1/courses/${courseId}/assignments/${assignmentId}`,
    studentConfig
  );

  // Process Canvas attachments and Google Docs in parallel
  const [attachments, googleDocs] = await Promise.all([
    // Canvas file attachments
    Promise.all(
      (assignment.attachments || []).map(async (file) => {
        const content = await fetchFileContent(file, studentConfig);
        return {
          id: file.id,
          name: file.display_name,
          contentType: file["content-type"],
          size: file.size,
          content: content ?? undefined,
          error: content === null ? "Could not fetch/parse file content" : undefined,
        };
      })
    ),
    // Google Docs/Sheets/Drive files linked in description
    assignment.description ? fetchAllGoogleContent(assignment.description) : Promise.resolve([]),
  ]);

  return {
    assignmentId: assignment.id,
    courseId,
    name: assignment.name,
    description: assignment.description,
    descriptionText: assignment.description ? stripHtml(assignment.description, 5000) : null,
    dueAt: assignment.due_at,
    points: assignment.points_possible,
    url: assignment.html_url,
    attachments,
    googleDocs: googleDocs.length > 0 ? googleDocs : undefined,
  };
}

// Also fetch any linked pages/modules (Canvas quizzes are often separate)
export async function getAssignmentWithExternalContent(
  courseId: number,
  assignmentId: number,
  studentConfig: StudentConfig
): Promise<AssignmentContent & { externalContent?: string }> {
  const content = await getAssignmentContent(courseId, assignmentId, studentConfig);

  // Check if description contains links to Canvas pages or external resources
  // This is a simplified version - could be expanded
  let externalContent: string | undefined;

  if (content.description) {
    // Look for Canvas quiz links in description
    const quizMatch = content.description.match(/\/courses\/\d+\/quizzes\/(\d+)/);
    if (quizMatch) {
      try {
        const quizId = quizMatch[1];
        const quiz = await canvasFetch<{ title: string; description: string }>(
          `/api/v1/courses/${courseId}/quizzes/${quizId}`,
          studentConfig
        );
        externalContent = `Quiz: ${quiz.title}\n\n${stripHtml(quiz.description, 5000)}`;
      } catch {
        // Quiz not accessible
      }
    }
  }

  return { ...content, externalContent };
}
