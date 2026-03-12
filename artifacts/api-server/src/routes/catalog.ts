import { Router, type IRouter } from "express";
import { db, productsTable, categoriesTable, activityLogsTable } from "@workspace/db";
import { eq, sql, desc, and } from "drizzle-orm";
import { logActivity } from "../lib/activity-logger";

const router: IRouter = Router();

router.get("/catalog-index", async (req, res) => {
  const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
  const where = categoryId ? eq(productsTable.categoryId, categoryId) : undefined;

  const products = await db
    .select({
      id: productsTable.id,
      categoryId: productsTable.categoryId,
      categoryName: categoriesTable.name,
      name: productsTable.name,
      skuCode: productsTable.skuCode,
      kcplCode: productsTable.kcplCode,
      vehicleBrand: productsTable.vehicleBrand,
      engineBrand: productsTable.engineBrand,
      productType: productsTable.productType,
      size: productsTable.size,
      imageUrl: productsTable.imageUrl,
      specifications: productsTable.specifications,
      createdAt: productsTable.createdAt,
      updatedAt: productsTable.updatedAt,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(where)
    .orderBy(productsTable.vehicleBrand, productsTable.size, productsTable.name);

  const brandMap = new Map<string, Map<string, typeof products>>();
  for (const product of products) {
    const brand = product.vehicleBrand || "Unknown";
    const size = product.size || "Unknown";
    if (!brandMap.has(brand)) brandMap.set(brand, new Map());
    const sizeMap = brandMap.get(brand)!;
    if (!sizeMap.has(size)) sizeMap.set(size, []);
    sizeMap.get(size)!.push(product);
  }

  const index = Array.from(brandMap.entries()).map(([brand, sizeMap]) => ({
    brand,
    sizes: Array.from(sizeMap.entries()).map(([size, prods]) => ({ size, products: prods })),
  }));

  res.json(index);
});

router.get("/catalog/stats", async (_req, res) => {
  const categories = await db.select().from(categoriesTable).orderBy(categoriesTable.id);
  
  const breakdown = await Promise.all(categories.map(async (cat) => {
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(productsTable).where(eq(productsTable.categoryId, cat.id));
    return { name: cat.name, count };
  }));

  const radiatorCat = categories.find(c => c.slug === "radiators");
  const condenserCat = categories.find(c => c.slug === "condensers");

  const totalRadiators = breakdown.find(b => b.name === (radiatorCat?.name))?.count ?? 0;
  const totalCondensers = breakdown.find(b => b.name === (condenserCat?.name))?.count ?? 0;
  const totalProducts = breakdown.reduce((sum, b) => sum + b.count, 0);

  const recentActivity = await db.select().from(activityLogsTable).orderBy(desc(activityLogsTable.createdAt)).limit(5);

  const lastUpdated = recentActivity[0]?.createdAt ?? new Date();

  res.json({ totalRadiators, totalCondensers, totalProducts, lastUpdated, recentActivity, categoryBreakdown: breakdown });
});

router.post("/catalog/export", async (req, res) => {
  const { format, sections } = req.body;
  await logActivity({ action: "Exported", entityType: "Catalog", entityId: 0, details: `Catalog exported as ${format} with sections: ${sections.join(", ")}` });
  res.json({
    success: true,
    message: `Catalog exported successfully as ${format.toUpperCase()}. ${sections.length} sections included.`,
    downloadUrl: `/api/catalog/download/${format}`,
    exportedAt: new Date(),
  });
});

export default router;
