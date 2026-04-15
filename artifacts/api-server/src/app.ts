/**
 * Express application setup for the Smart Inhaler Monitor API.
 * Configures middleware (logging, CORS, JSON parsing) and mounts API routes.
 *
 * This system simulates Edge AI locally.
 * In real-world implementation, TensorFlow Lite can be used for on-device inference.
 */
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// HTTP request/response logging via pino — strips sensitive headers
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          // Strip query params from logged URL to avoid leaking sensitive data
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Allow cross-origin requests from the frontend (localhost:5173 in dev)
app.use(cors());

// Parse incoming JSON and URL-encoded request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount all API routes under /api prefix
app.use("/api", router);

// Global error handler — catches any unhandled errors from route handlers
// and returns a structured JSON error response instead of crashing
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err, method: req.method, url: req.url }, "Unhandled server error");
  res.status(500).json({
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "production" ? "An unexpected error occurred." : err.message,
  });
});

export default app;
