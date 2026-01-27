import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname } from "path";
import { config } from "../config.js";
import type { StudentName, WeeklyEmail } from "../types/student.js";

interface WeeklyEmailStore {
  emails: WeeklyEmail[];
}

async function ensureDir(filePath: string): Promise<void> {
  const dir = dirname(filePath);
  await mkdir(dir, { recursive: true });
}

async function loadStore(): Promise<WeeklyEmailStore> {
  try {
    const data = await readFile(config.weeklyEmailPath, "utf-8");
    return JSON.parse(data) as WeeklyEmailStore;
  } catch (error: unknown) {
    // File doesn't exist or is invalid - return empty store
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { emails: [] };
    }
    throw error;
  }
}

async function saveStore(store: WeeklyEmailStore): Promise<void> {
  await ensureDir(config.weeklyEmailPath);
  await writeFile(config.weeklyEmailPath, JSON.stringify(store, null, 2), "utf-8");
}

/**
 * Get the most recent weekly email for a student
 */
export async function getWeeklyEmail(student: StudentName): Promise<WeeklyEmail | null> {
  const store = await loadStore();
  
  // Find the most recent email for this student
  const studentEmails = store.emails
    .filter((e) => e.student === student)
    .sort((a, b) => new Date(b.weekOf).getTime() - new Date(a.weekOf).getTime());
  
  return studentEmails[0] ?? null;
}

/**
 * Get weekly email for a specific week
 */
export async function getWeeklyEmailForWeek(
  student: StudentName,
  weekOf: string
): Promise<WeeklyEmail | null> {
  const store = await loadStore();
  return store.emails.find((e) => e.student === student && e.weekOf === weekOf) ?? null;
}

/**
 * Save or update a weekly email
 */
export async function saveWeeklyEmail(email: Omit<WeeklyEmail, "updatedAt">): Promise<WeeklyEmail> {
  const store = await loadStore();
  
  const now = new Date().toISOString();
  const fullEmail: WeeklyEmail = {
    ...email,
    updatedAt: now,
  };
  
  // Check if we already have an email for this student/week
  const existingIndex = store.emails.findIndex(
    (e) => e.student === email.student && e.weekOf === email.weekOf
  );
  
  if (existingIndex >= 0) {
    // Update existing
    store.emails[existingIndex] = fullEmail;
  } else {
    // Add new
    store.emails.push(fullEmail);
  }
  
  await saveStore(store);
  return fullEmail;
}

/**
 * Get all weekly emails for a student (for history)
 */
export async function getWeeklyEmailHistory(
  student: StudentName,
  limit: number = 10
): Promise<WeeklyEmail[]> {
  const store = await loadStore();
  
  return store.emails
    .filter((e) => e.student === student)
    .sort((a, b) => new Date(b.weekOf).getTime() - new Date(a.weekOf).getTime())
    .slice(0, limit);
}
