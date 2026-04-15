import { Router, type IRouter } from "express";
import healthRouter from "./health";
import inhalerRouter from "./inhaler";

const router: IRouter = Router();

router.use(healthRouter);
router.use(inhalerRouter);

export default router;
