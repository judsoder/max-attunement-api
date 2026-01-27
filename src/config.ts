import { z } from "zod";
import dotenv from "dotenv";
import type { StudentName, StudentConfig } from "./types/student.js";

dotenv.config();

const configSchema = z.object({
  port: z.coerce.number().default(3000),
  apiKey: z.string().min(1, "API_KEY is required"),

  // Canvas base URL (shared)
  canvasBaseUrl: z.string().url(),

  // Max's config
  maxCanvasToken: z.string().min(1, "MAX_CANVAS_TOKEN is required"),
  maxCanvasStudentId: z.coerce.number(),
  maxGoogleCalendarId: z.string().email(),

  // Lev's config
  levCanvasToken: z.string().min(1, "LEV_CANVAS_TOKEN is required"),
  levCanvasStudentId: z.coerce.number(),
  levGoogleCalendarId: z.string().email(),

  // Google OAuth (shared - same parent account)
  googleClientId: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  googleClientSecret: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),
  googleRefreshToken: z.string().min(1, "GOOGLE_REFRESH_TOKEN is required"),

  // Google Drive (shared)
  driveFolderName: z.string().default("Attunement Assistant"),
  reflectionFileName: z.string().default("reflections.jsonl"),

  // Weekly email storage path
  weeklyEmailPath: z.string().default("./data/weekly-emails.json"),
});

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  const result = configSchema.safeParse({
    port: process.env.PORT,
    apiKey: process.env.API_KEY,

    canvasBaseUrl: process.env.CANVAS_BASE_URL,

    // Max
    maxCanvasToken: process.env.MAX_CANVAS_TOKEN,
    maxCanvasStudentId: process.env.MAX_CANVAS_STUDENT_ID,
    maxGoogleCalendarId: process.env.MAX_GOOGLE_CALENDAR_ID,

    // Lev
    levCanvasToken: process.env.LEV_CANVAS_TOKEN,
    levCanvasStudentId: process.env.LEV_CANVAS_STUDENT_ID,
    levGoogleCalendarId: process.env.LEV_GOOGLE_CALENDAR_ID,

    // Google OAuth
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    googleRefreshToken: process.env.GOOGLE_REFRESH_TOKEN,

    // Google Drive
    driveFolderName: process.env.DRIVE_FOLDER_NAME,
    reflectionFileName: process.env.REFLECTION_FILE_NAME,

    // Weekly email
    weeklyEmailPath: process.env.WEEKLY_EMAIL_PATH,
  });

  if (!result.success) {
    console.error("Configuration validation failed:");
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  return result.data;
}

export const config = loadConfig();

// Student-specific config helpers
const studentConfigs: Record<StudentName, StudentConfig> = {
  max: {
    name: "max",
    displayName: "Max",
    canvasToken: config.maxCanvasToken,
    canvasStudentId: config.maxCanvasStudentId,
    googleCalendarId: config.maxGoogleCalendarId,
    supportsWeeklyEmail: false,
  },
  lev: {
    name: "lev",
    displayName: "Lev",
    canvasToken: config.levCanvasToken,
    canvasStudentId: config.levCanvasStudentId,
    googleCalendarId: config.levGoogleCalendarId,
    supportsWeeklyEmail: true,
  },
};

export function getStudentConfig(student: StudentName): StudentConfig {
  const studentConfig = studentConfigs[student];
  if (!studentConfig) {
    throw new Error(`Unknown student: ${student}`);
  }
  return studentConfig;
}

export function isValidStudent(student: string): student is StudentName {
  return student === "max" || student === "lev";
}

export const validStudents: StudentName[] = ["max", "lev"];
