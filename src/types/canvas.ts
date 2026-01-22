// Raw Canvas API response types
export interface CanvasCourse {
  id: number;
  name: string;
  course_code: string;
  workflow_state: string;
  enrollments?: Array<{
    type: string;
    computed_current_score: number | null;
    computed_current_grade: string | null;
    computed_final_score: number | null;
    computed_final_grade: string | null;
  }>;
}

export interface CanvasAssignment {
  id: number;
  name: string;
  description: string | null;
  due_at: string | null;
  points_possible: number;
  html_url: string;
  workflow_state: string;
  submission?: {
    workflow_state: string;
    submitted_at: string | null;
    score: number | null;
    graded_at: string | null;
  };
}

export interface CanvasSubmission {
  id: number;
  assignment_id: number;
  workflow_state: string;
  submitted_at: string | null;
  graded_at: string | null;
  score: number | null;
  assignment?: {
    id: number;
    name: string;
    points_possible: number | null;
    html_url: string;
  };
}

// Transformed types for API response
export interface Assignment {
  id: number;
  name: string;
  courseId: number;
  courseName: string;
  dueAt: string | null;
  due: string;
  points: number;
  status: string;
  desc: string;
  url: string | null;
}

export interface CoursePerformance {
  courseId: number;
  courseName: string;
  currentScore: number | null;
  currentGrade: string | null;
  finalScore: number | null;
  finalGrade: string | null;
}

export interface GradedAssignment {
  assignmentId: number;
  title: string;
  score: number;
  pointsPossible: number | null;
  gradedAt: string | null;
  submittedAt: string | null;
  url: string | null;
}

export interface RecentPerformance {
  courseId: number;
  courseName: string;
  recentGraded: GradedAssignment[];
}
