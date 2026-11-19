import { Router, type IRouter } from "express";
import healthRouter from "./health";
import { guideRouter } from "./guide";
import { authRouter, passRouter } from "../auth/router";
import { requirePass } from "../auth/sessions";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/passes", passRouter);
// Everything after this boundary requires a live session AND a current pass.
router.use(requirePass);
router.use("/guide", guideRouter);

export default router;
