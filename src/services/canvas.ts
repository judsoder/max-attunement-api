import { config } from "../config.js";
import { stripHtml } from "../utils/html.js";
import { isWithinDays, formatDateDenver } from "../utils/date.js";
import type {
  CanvasCourse,
  CanvasAssignment,
  CanvasSubmission,
  Assignment,
  CoursePerformance,
  RecentPerformance,
  GradedAssignment,
} from "../types/canvas.js";

const DAYS_AHEAD = 7;

async function canvasFetch<T>(path: string): Promise<T> {
  const url = `${config.canvasBaseUrl}${path}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.canvasToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Canvas API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export async function getCourses(): Promise<CanvasCourse[]> {
  return canvasFetch<CanvasCourse[]>(
    `/api/v1/users/${config.canvasStudentId}/courses?per_page=100&enrollment_state=active&include[]=total_scores`
  );
}

export async function getAssignmentsForCourse(courseId: number): Promise<CanvasAssignment[]> {
  return canvasFetch<CanvasAssignment[]>(
    `/api/v1/courses/${courseId}/assignments?include[]=submission&include[]=assignment_visibility&include[]=overrides&include[]=description&per_page=100`
  );
}

export async function getSubmissionsForCourse(courseId: number): Promise<CanvasSubmission[]> {
  return canvasFetch<CanvasSubmission[]>(
    `/api/v1/courses/${courseId}/students/submissions?student_ids[]=${config.canvasStudentId}&include[]=assignment&per_page=50`
  );
}

export async function getAllAssignments(): Promise<{
  assignments: Assignment[];
  coursePerformance: CoursePerformance[];
  recentPerformance: RecentPerformance[];
}> {
  const courses = await getCourses();
  const activeCourses = courses.filter((c) => c.workflow_state === "available");

  const allAssignments: Assignment[] = [];
  const coursePerformance: CoursePerformance[] = [];
  const recentPerformance: RecentPerformance[] = [];

  // Process each course in parallel
  await Promise.all(
    activeCourses.map(async (course) => {
      // Get assignments and submissions in parallel
      const [rawAssignments, rawSubmissions] = await Promise.all([
        getAssignmentsForCourse(course.id),
        getSubmissionsForCourse(course.id),
      ]);

      // Build course performance
      const enrollment = course.enrollments?.find((e) => e.type === "student");
      coursePerformance.push({
        courseId: course.id,
        courseName: course.name,
        currentScore: enrollment?.computed_current_score ?? null,
        currentGrade: enrollment?.computed_current_grade ?? null,
        finalScore: enrollment?.computed_final_score ?? null,
        finalGrade: enrollment?.computed_final_grade ?? null,
      });

      // Filter assignments to next 7 days
      const upcomingAssignments = rawAssignments
        .filter((a) => isWithinDays(a.due_at, DAYS_AHEAD))
        .map((a): Assignment => ({
          id: a.id,
          name: a.name,
          courseId: course.id,
          courseName: course.name,
          dueAt: a.due_at,
          due: a.due_at ? formatDateDenver(a.due_at).split(",").slice(0, 2).join(",").trim() : null,

          points: a.points_possible,
          status: a.submission?.workflow_state ?? a.workflow_state,
          desc: stripHtml(a.description, 140),
          url: a.html_url ?? null,
        }));

      allAssignments.push(...upcomingAssignments);

      // Build recent graded (last 3 graded submissions)
      const gradedSubmissions = rawSubmissions
        .filter((s) => s.graded_at && s.score !== null && s.assignment)
        .sort((a, b) => {
          const dateA = a.graded_at ? new Date(a.graded_at).getTime() : 0;
          const dateB = b.graded_at ? new Date(b.graded_at).getTime() : 0;
          return dateB - dateA;
        })
        .slice(0, 3)
        .map((s): GradedAssignment => ({
          assignmentId: s.assignment_id,
          title: s.assignment?.name ?? "Unknown",
          score: s.score!,
          pointsPossible: s.assignment?.points_possible ?? null,
          gradedAt: s.graded_at,
          submittedAt: s.submitted_at,
          url: s.assignment?.html_url ?? null,
        }));

      if (gradedSubmissions.length > 0) {
        recentPerformance.push({
          courseId: course.id,
          courseName: course.name,
          recentGraded: gradedSubmissions,
        });
      }
    })
  );

  // Sort assignments by due date
  allAssignments.sort((a, b) => {
    if (!a.dueAt) return 1;
    if (!b.dueAt) return -1;
    return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
  });

  return { assignments: allAssignments, coursePerformance, recentPerformance };
}
