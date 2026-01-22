import { FastifyRequest, FastifyReply, FastifyInstance } from "fastify";
import { config } from "../config.js";

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const apiKey = request.headers["x-api-key"];

  if (!apiKey) {
    reply.code(403).send({
      error: "Forbidden",
      message: "Missing X-API-Key header",
    });
    return;
  }

  if (apiKey !== config.apiKey) {
    reply.code(403).send({
      error: "Forbidden",
      message: "Invalid API key",
    });
    return;
  }
}

export function registerAuthHook(app: FastifyInstance): void {
  app.addHook("preHandler", authMiddleware);
}
