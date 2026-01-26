import { readdir, readFile } from "fs/promises";
import { join } from "path";
import type { Syllabus, GradeWeight, KeyPolicy, GradeWeightSummary } from "../types/syllabus.js";

// Path to syllabi directory (relative to project root, works in both dev and prod)
const SYLLABI_DIR = join(process.cwd(), "syllabi");

// Course name mappings for better matching
const COURSE_ALIASES: Record<string, string[]> = {
  "latin-iii": ["latin", "latin 3", "latin iii"],
  "algebra-2-honors": ["algebra", "algebra 2", "math", "honors math"],
  "computing-viii": ["computing", "computers", "computer science", "cs"],
  "english-viii": ["english", "english 8"],
  "fitness": ["fitness", "pe", "gym", "physical education"],
  "history-viii": ["history", "history 8"],
  "chorus": ["chorus", "choir", "music", "singing"],
  "science-viii": ["science", "biology", "science 8"],
};

/**
 * Parse grade weights from markdown content
 */
function parseGradeWeights(content: string): GradeWeight[] {
  const weights: GradeWeight[] = [];
  
  // Look for tables with weight information
  const tableRegex = /\|[^|]+\|[^|]*(\d+)%[^|]*\|/g;
  const lines = content.split("\n");
  
  for (const line of lines) {
    // Match patterns like "| Category | 30% |" or "| Category | 30% | Notes |"
    const match = line.match(/\|\s*([^|]+?)\s*\|\s*(\d+)%/);
    if (match) {
      const category = match[1].trim();
      const weight = parseInt(match[2], 10);
      
      // Skip header rows and non-category rows
      if (category.toLowerCase() === "category" || 
          category.toLowerCase() === "grade" ||
          category === "-------" ||
          category.startsWith("-")) {
        continue;
      }
      
      // Check for notes in third column
      const notesMatch = line.match(/\|\s*[^|]+\s*\|\s*\d+%\s*\|\s*([^|]+)\s*\|/);
      const notes = notesMatch ? notesMatch[1].trim() : undefined;
      
      weights.push({ category, weight, notes: notes || undefined });
    }
  }
  
  return weights;
}

/**
 * Parse key policies from markdown content
 */
function parseKeyPolicies(content: string): KeyPolicy[] {
  const policies: KeyPolicy[] = [];
  
  // Look for key policy patterns
  const policyPatterns = [
    { regex: /late.*?(?:work|assignment).*?[:]\s*([^\n]+)/gi, name: "Late Work" },
    { regex: /retak(?:e|ing).*?[:]\s*([^\n]+)/gi, name: "Retakes" },
    { regex: /redo.*?[:]\s*([^\n]+)/gi, name: "Redo Policy" },
    { regex: /extension.*?[:]\s*([^\n]+)/gi, name: "Extensions" },
    { regex: /drop.*?(?:lowest|grade|score).*?([^\n]+)/gi, name: "Drop Policy" },
  ];
  
  for (const { regex, name } of policyPatterns) {
    const match = content.match(regex);
    if (match) {
      policies.push({ name, description: match[0].replace(/^[#*-]\s*/, "").trim() });
    }
  }
  
  // Also look for highlighted policies (with emoji or bold)
  const highlightedPolicies = content.match(/[🔄✅⚠️🌟📊🎯]\s*\*\*([^*]+)\*\*[^*\n]*/g);
  if (highlightedPolicies) {
    for (const policy of highlightedPolicies) {
      const cleaned = policy.replace(/[🔄✅⚠️🌟📊🎯]\s*\*\*/g, "").replace(/\*\*/g, "").trim();
      if (!policies.some(p => p.description.includes(cleaned.slice(0, 20)))) {
        policies.push({ name: "Highlight", description: cleaned });
      }
    }
  }
  
  return policies;
}

/**
 * Parse teacher info from markdown content
 */
function parseTeacherInfo(content: string): { teacher?: string; email?: string; room?: string; officeHours?: string } {
  const teacherMatch = content.match(/\*\*Teacher:\*\*\s*([^\n*]+)/i) || 
                       content.match(/\*\*Instructor[s]?:\*\*\s*([^\n*]+)/i);
  const emailMatch = content.match(/\*\*Email:\*\*\s*([^\n*]+)/i) ||
                     content.match(/([a-zA-Z0-9._%+-]+@waterfordschool\.org)/i);
  const roomMatch = content.match(/\*\*Room[s]?:\*\*\s*([^\n*]+)/i) ||
                    content.match(/\*\*Classroom:\*\*\s*([^\n*]+)/i);
  const officeHoursMatch = content.match(/\*\*Office Hours:\*\*\s*([^\n*]+)/i);
  
  return {
    teacher: teacherMatch ? teacherMatch[1].trim() : undefined,
    email: emailMatch ? emailMatch[1].trim() : undefined,
    room: roomMatch ? roomMatch[1].trim() : undefined,
    officeHours: officeHoursMatch ? officeHoursMatch[1].trim() : undefined,
  };
}

/**
 * Extract course name from markdown heading
 */
function parseCourseTitle(content: string): string {
  const titleMatch = content.match(/^#\s+([^\n]+)/m);
  return titleMatch ? titleMatch[1].trim() : "Unknown Course";
}

/**
 * Load and parse a single syllabus file
 */
async function loadSyllabus(filename: string): Promise<Syllabus> {
  const filepath = join(SYLLABI_DIR, filename);
  const content = await readFile(filepath, "utf-8");
  const slug = filename.replace(".md", "");
  
  const teacherInfo = parseTeacherInfo(content);
  
  return {
    course: parseCourseTitle(content),
    slug,
    ...teacherInfo,
    gradeWeights: parseGradeWeights(content),
    keyPolicies: parseKeyPolicies(content),
    rawMarkdown: content,
  };
}

/**
 * Load all syllabi
 */
export async function getAllSyllabi(): Promise<Syllabus[]> {
  const files = await readdir(SYLLABI_DIR);
  const mdFiles = files.filter(f => f.endsWith(".md"));
  
  const syllabi = await Promise.all(mdFiles.map(loadSyllabus));
  return syllabi.sort((a, b) => a.course.localeCompare(b.course));
}

/**
 * Get a single syllabus by slug or course name
 */
export async function getSyllabus(identifier: string): Promise<Syllabus | null> {
  const normalizedId = identifier.toLowerCase().trim();
  const syllabi = await getAllSyllabi();
  
  // Try exact slug match first
  let syllabus = syllabi.find(s => s.slug === normalizedId);
  if (syllabus) return syllabus;
  
  // Try alias match
  for (const [slug, aliases] of Object.entries(COURSE_ALIASES)) {
    if (aliases.some(alias => normalizedId.includes(alias) || alias.includes(normalizedId))) {
      syllabus = syllabi.find(s => s.slug === slug);
      if (syllabus) return syllabus;
    }
  }
  
  // Try partial match on course name
  syllabus = syllabi.find(s => 
    s.course.toLowerCase().includes(normalizedId) ||
    normalizedId.includes(s.course.toLowerCase().split(" ")[0])
  );
  
  return syllabus || null;
}

/**
 * Get grade weight summary for all courses
 */
export async function getGradeWeightSummary(): Promise<GradeWeightSummary[]> {
  const syllabi = await getAllSyllabi();
  
  return syllabi.map(s => ({
    course: s.course,
    slug: s.slug,
    weights: s.gradeWeights,
  }));
}

/**
 * Find the best syllabus match for a Canvas course name
 */
export async function matchSyllabusToCourse(canvasCourseName: string): Promise<Syllabus | null> {
  const normalized = canvasCourseName.toLowerCase();
  
  // Check each alias set
  for (const [slug, aliases] of Object.entries(COURSE_ALIASES)) {
    if (aliases.some(alias => normalized.includes(alias))) {
      return getSyllabus(slug);
    }
  }
  
  // Fallback to general search
  return getSyllabus(canvasCourseName);
}
