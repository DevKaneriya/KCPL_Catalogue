import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import rolesRouter from "./roles";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import contentPagesRouter from "./content-pages";
import catalogRouter from "./catalog";
import activityLogsRouter from "./activity-logs";
import mastersRouter from "./masters";
import uploadRouter from "./upload";

const router: IRouter = Router();

router.get("/", (_req, res) => {
  res.json({
    status: "ok",
    message: "API base. Try /api/healthz or /api/products.",
  });
});

router.use("/masters", mastersRouter);
router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(rolesRouter);
router.use(categoriesRouter);
router.use(productsRouter);
router.use(contentPagesRouter);
router.use(catalogRouter);
router.use(activityLogsRouter);
router.use(uploadRouter);

export default router;
