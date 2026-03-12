import { Router, type IRouter } from "express";
import healthRouter from "./health";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import contentPagesRouter from "./content-pages";
import catalogRouter from "./catalog";
import activityLogsRouter from "./activity-logs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(categoriesRouter);
router.use(productsRouter);
router.use(contentPagesRouter);
router.use(catalogRouter);
router.use(activityLogsRouter);

export default router;
