import { Router, type IRouter } from "express";
import { db, activityLogsTable } from "@workspace/db";
import { desc, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/activity-logs", async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const offset = (page - 1) * limit;

  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(activityLogsTable);
  const logs = await db.select().from(activityLogsTable).orderBy(desc(activityLogsTable.createdAt)).limit(limit).offset(offset);
  res.json({ logs, total, page, limit });
});

export default router;
