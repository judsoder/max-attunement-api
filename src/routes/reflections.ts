import { FastifyInstance } from "fastify";
import { z } from "zod";
import { config } from "../config.js";
import {
  saveReflection,
  getRecentReflections,
  cleanupReflections,
} from "../services/drive-reflections.js";
import type {
  SaveReflectionResponse,
  RecentReflectionsResponse,
  CleanupReflectionsResponse,
} from "../types/reflections.js";

const saveReflectionSchema = z.object({
  who: z.enum(["Jud", "Jules", "Max"]),
  text: z.string().min(1),
  threads: z.array(z.string()).default([]),
});

const recentReflectionsSchema = z.object({
  n: z.number().int().min(1).max(100).default(8),
});

export async function reflectionsRoutes(app: FastifyInstance): Promise<void> {
  // POST /reflections/save
  app.post("/reflections/save", async (request, reply) => {
    const parsed = saveReflectionSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "ValidationError",
        message: "Invalid request body",
        details: parsed.error.issues,
      });
    }

    const { fileId, appendedAt } = await saveReflection(parsed.data);

    const response: SaveReflectionResponse = {
      ok: true,
      fileId,
      fileName: config.reflectionFileName,
      appendedAt,
    };

    return response;
  });

  // POST /reflections/recent
  app.post("/reflections/recent", async (request, reply) => {
    const parsed = recentReflectionsSchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      return reply.code(400).send({
        error: "ValidationError",
        message: "Invalid request body",
        details: parsed.error.issues,
      });
    }

    const reflections = await getRecentReflections(parsed.data.n);

    const response: RecentReflectionsResponse = {
      count: reflections.length,
      reflections,
    };

    return response;
  });

  // POST /reflections/cleanup
  app.post("/reflections/cleanup", async () => {
    const { removedCount, cleanedAt } = await cleanupReflections();

    const response: CleanupReflectionsResponse = {
      ok: true,
      removedCount,
      cleanedAt,
    };

    return response;
  });
}
