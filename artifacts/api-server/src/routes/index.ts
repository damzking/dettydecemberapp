import { Router, type IRouter } from "express";
import healthRouter from "./health";
import { guideRouter } from "./guide";

const router: IRouter = Router();

router.use(healthRouter);
// Future pass enforcement can be mounted here before guideRouter.
router.use("/guide", guideRouter);

export default router;
