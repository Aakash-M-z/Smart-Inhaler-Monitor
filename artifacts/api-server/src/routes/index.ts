import { Router, type IRouter } from "express";
import healthRouter from "./health";
import inhalerRouter from "./inhaler";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(inhalerRouter);

// Groq AI Health Assistant — POST /api/ai/chat
router.use("/ai", aiRouter);

export default router;
