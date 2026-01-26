export interface GradeWeight {
  category: string;
  weight: number;
  notes?: string;
}

export interface KeyPolicy {
  name: string;
  description: string;
}

export interface Syllabus {
  course: string;
  slug: string;
  teacher?: string;
  email?: string;
  room?: string;
  officeHours?: string;
  gradeWeights: GradeWeight[];
  keyPolicies: KeyPolicy[];
  rawMarkdown: string;
}

export interface SyllabusListResponse {
  syllabi: Syllabus[];
  summary: GradeWeightSummary[];
}

export interface GradeWeightSummary {
  course: string;
  slug: string;
  weights: GradeWeight[];
}

export interface SyllabusResponse {
  syllabus: Syllabus;
}
