import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const configSchema = z.object({
  port: z.coerce.number().default(3000),
  apiKey: z.string().min(1, "API_KEY is required"),

  // Canvas
  canvasBaseUrl: z.string().url(),
  canvasToken: z.string().min(1, "CANVAS_TOKEN is required"),
  canvasStudentId: z.coerce.number(),

  // Google OAuth
  googleClientId: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  googleClientSecret: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),
  googleRefreshToken: z.string().min(1, "GOOGLE_REFRESH_TOKEN is required"),

  // Google Services
  googleCalendarId: z.string().email(),
  driveFolderName: z.string().default("Max Attunement Assistant"),
  reflectionFileName: z.string().default("max_reflections.jsonl"),
});

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  const result = configSchema.safeParse({
    port: process.env.PORT,
    apiKey: process.env.API_KEY,

    canvasBaseUrl: process.env.CANVAS_BASE_URL,
    canvasToken: process.env.CANVAS_TOKEN,
    canvasStudentId: process.env.CANVAS_STUDENT_ID,

    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    googleRefreshToken: process.env.GOOGLE_REFRESH_TOKEN,

    googleCalendarId: process.env.GOOGLE_CALENDAR_ID,
    driveFolderName: process.env.DRIVE_FOLDER_NAME,
    reflectionFileName: process.env.REFLECTION_FILE_NAME,
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
