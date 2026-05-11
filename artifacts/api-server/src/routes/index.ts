import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tournamentsRouter from "./tournaments";
import playersRouter from "./players";
import matchesRouter from "./matches";
import statsRouter from "./stats";
import adminRouter from "./admin";
import anthropicRouter from "./anthropic";

const router: IRouter = Router();

router.use(healthRouter);
router.use(tournamentsRouter);
router.use(playersRouter);
router.use(matchesRouter);
router.use(statsRouter);
router.use(adminRouter);
router.use(anthropicRouter);

export default router;
