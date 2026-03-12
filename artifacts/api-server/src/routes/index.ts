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

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(rolesRouter);
router.use(categoriesRouter);
router.use(productsRouter);
router.use(contentPagesRouter);
router.use(catalogRouter);
router.use(activityLogsRouter);

export default router;
