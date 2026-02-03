import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import { config, validStudents } from "./config.js";
import { registerAuthHook } from "./middleware/auth.js";
import { contextRoutes } from "./routes/context.js";
import { reflectionsRoutes } from "./routes/reflections.js";
import { syllabusRoutes } from "./routes/syllabus.js";
import { weeklyEmailRoutes } from "./routes/weekly-email.js";
import { assignmentContentRoutes } from "./routes/assignment-content.js";
import { courseMaterialsRoutes } from "./routes/course-materials.js";
import { fileRoutes } from "./routes/file.js";

const app = Fastify({
  logger: true,
});

// Register rate limiter
app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
});

// Register auth middleware
registerAuthHook(app);

// Error handler for structured errors
app.setErrorHandler((error, request, reply) => {
  request.log.error(error);

  const statusCode = error.statusCode ?? 500;
  reply.code(statusCode).send({
    error: error.name ?? "InternalServerError",
    message: error.message ?? "An unexpected error occurred",
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
});

// Register routes
app.register(contextRoutes);
app.register(reflectionsRoutes);
app.register(syllabusRoutes);
app.register(weeklyEmailRoutes);
app.register(assignmentContentRoutes);
app.register(courseMaterialsRoutes);
app.register(fileRoutes);

// Health check (no auth required - registered before auth hook)
app.get("/health", { preHandler: [] }, async () => {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    students: validStudents,
  };
});

// Start server
const start = async () => {
  try {
    await app.listen({ port: config.port, host: "0.0.0.0" });
    console.log(`Server listening on port ${config.port}`);
    console.log(`Supported students: ${validStudents.join(", ")}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
