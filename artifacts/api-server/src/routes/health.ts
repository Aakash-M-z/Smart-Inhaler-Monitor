/**
 * Health check route.
 * Used by load balancers and monitoring tools to verify the server is running.
 */
import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

/**
 * GET /healthz
 * Returns { status: "ok" } when the server is healthy.
 */
router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

export default router;
