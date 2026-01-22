import { google } from "googleapis";
import { config } from "../config.js";
import { toISODenver } from "../utils/date.js";
import { fileIdCache } from "../utils/cache.js";
import type { Reflection, SaveReflectionRequest } from "../types/reflections.js";

function getOAuth2Client() {
  const oauth2Client = new google.auth.OAuth2(
    config.googleClientId,
    config.googleClientSecret
  );

  oauth2Client.setCredentials({
    refresh_token: config.googleRefreshToken,
  });

  return oauth2Client;
}

async function findFolderId(): Promise<string> {
  const cached = fileIdCache.get("folderId");
  if (cached) return cached;

  const auth = getOAuth2Client();
  const drive = google.drive({ version: "v3", auth });

  const response = await drive.files.list({
    q: `name='${config.driveFolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
    spaces: "drive",
  });

  const folder = response.data.files?.[0];
  if (!folder?.id) {
    throw new Error(`Folder "${config.driveFolderName}" not found in Google Drive`);
  }

  fileIdCache.set("folderId", folder.id);
  return folder.id;
}

async function findOrCreateFile(): Promise<string> {
  const cached = fileIdCache.get("reflectionFileId");
  if (cached) return cached;

  const auth = getOAuth2Client();
  const drive = google.drive({ version: "v3", auth });
  const folderId = await findFolderId();

  // Search for existing file
  const response = await drive.files.list({
    q: `name='${config.reflectionFileName}' and '${folderId}' in parents and trashed=false`,
    fields: "files(id, name)",
    spaces: "drive",
  });

  let fileId = response.data.files?.[0]?.id;

  if (!fileId) {
    // Create the file if it doesn't exist
    const createResponse = await drive.files.create({
      requestBody: {
        name: config.reflectionFileName,
        parents: [folderId],
        mimeType: "text/plain",
      },
      fields: "id",
    });

    fileId = createResponse.data.id;
    if (!fileId) {
      throw new Error("Failed to create reflections file");
    }
  }

  fileIdCache.set("reflectionFileId", fileId);
  return fileId;
}

async function getFileContent(): Promise<string> {
  const auth = getOAuth2Client();
  const drive = google.drive({ version: "v3", auth });
  const fileId = await findOrCreateFile();

  const response = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "text" }
  );

  return (response.data as string) || "";
}

async function setFileContent(content: string): Promise<void> {
  const auth = getOAuth2Client();
  const drive = google.drive({ version: "v3", auth });
  const fileId = await findOrCreateFile();

  await drive.files.update({
    fileId,
    media: {
      mimeType: "text/plain",
      body: content,
    },
  });
}

function parseJsonl(content: string): Reflection[] {
  if (!content.trim()) return [];

  const lines = content.trim().split("\n");
  const reflections: Reflection[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      reflections.push(JSON.parse(line));
    } catch {
      // Skip malformed lines
    }
  }

  return reflections;
}

function toJsonl(reflections: Reflection[]): string {
  return reflections.map((r) => JSON.stringify(r)).join("\n") + (reflections.length > 0 ? "\n" : "");
}

export async function saveReflection(
  request: SaveReflectionRequest
): Promise<{ fileId: string; appendedAt: string }> {
  const fileId = await findOrCreateFile();
  const existingContent = await getFileContent();

  const reflection: Reflection = {
    who: request.who,
    text: request.text,
    threads: request.threads,
    savedAt: toISODenver(),
  };

  const newLine = JSON.stringify(reflection) + "\n";
  const newContent = existingContent + newLine;

  await setFileContent(newContent);

  return {
    fileId,
    appendedAt: reflection.savedAt,
  };
}

export async function getRecentReflections(n: number): Promise<Reflection[]> {
  const content = await getFileContent();
  const reflections = parseJsonl(content);

  // Return most recent n reflections (newest first)
  return reflections.slice(-n).reverse();
}

export async function cleanupReflections(): Promise<{ removedCount: number; cleanedAt: string }> {
  const content = await getFileContent();
  const reflections = parseJsonl(content);

  // Deduplicate by text+who+threads (keep first occurrence)
  const seen = new Set<string>();
  const unique: Reflection[] = [];

  for (const r of reflections) {
    const key = `${r.who}|${r.text}|${r.threads.sort().join(",")}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(r);
    }
  }

  const removedCount = reflections.length - unique.length;

  // Add maintenance record
  const maintenanceRecord: Reflection = {
    who: "Max",
    text: `[MAINTENANCE] Cleanup completed. Removed ${removedCount} duplicate entries.`,
    threads: ["system", "maintenance"],
    savedAt: toISODenver(),
  };
  unique.push(maintenanceRecord);

  await setFileContent(toJsonl(unique));

  return {
    removedCount,
    cleanedAt: maintenanceRecord.savedAt,
  };
}
