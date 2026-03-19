import { Router, type IRouter } from "express";
import { db, productsTable, categoriesTable, activityLogsTable, contentPagesTable } from "@workspace/db";
import { eq, sql, desc, and, asc, inArray } from "drizzle-orm";
import { logActivity } from "../lib/activity-logger";

const router: IRouter = Router();

router.get("/catalog-index", async (req, res) => {
  const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
  const where = categoryId ? eq(productsTable.categoryId, categoryId) : undefined;

  const products = await db
    .select({
      id: productsTable.id,
      categoryId: productsTable.categoryId,
      categoryName: productsTable.categoryName,
      applicationCategory: productsTable.applicationCategory,
      productType: productsTable.productType,
      brandName: productsTable.brandName,
      kcplCode: productsTable.kcplCode,
      modelName: productsTable.modelName,
      size: productsTable.size,
      adaptablePartNo: productsTable.adaptablePartNo,
      imageUrl: productsTable.imageUrl,
      specifications: productsTable.specifications,
      createdAt: productsTable.createdAt,
      updatedAt: productsTable.updatedAt,
    })
    .from(productsTable)
    .where(where)
    .orderBy(productsTable.brandName, productsTable.size, productsTable.modelName);

  const brandMap = new Map<string, Map<string, typeof products>>();
  for (const product of products) {
    const brand = product.brandName || "Unknown";
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
  const [{ count: totalProductsRaw }] = await db.select({ count: sql<number>`count(*)` }).from(productsTable);
  const totalProducts = Number(totalProductsRaw) || 0;

  const breakdownRaw = await db.select({
    name: productsTable.productType,
    count: sql<number>`count(*)`
  }).from(productsTable).groupBy(productsTable.productType);

  const breakdown = breakdownRaw.map(b => ({
    name: b.name || "Uncategorized",
    count: Number(b.count)
  })).sort((a, b) => b.count - a.count);

  const topCategories = breakdown.slice(0, 2);

  const recentActivity = await db.select().from(activityLogsTable).orderBy(desc(activityLogsTable.createdAt)).limit(5);
  const lastUpdated = recentActivity[0]?.createdAt ?? new Date();

  res.json({ topCategories, totalProducts, lastUpdated, recentActivity, categoryBreakdown: breakdown });
});

  router.post("/catalog/preview-data", async (req, res) => {
    try {
      const { sections = [], categoryIds = [], applicationCategory, brandName, productType } = req.body as { 
        sections: string[]; categoryIds?: number[]; 
        applicationCategory?: string; brandName?: string; productType?: string; 
      };
      
      const selectedContentPageIds = sections
        .filter((section) => section.startsWith("content-page-"))
        .map((section) => Number(section.replace("content-page-", "")))
        .filter((id) => Number.isFinite(id));

      // Extract product types from sections if not explicitly provided
      const extractedProductTypes = sections
        .filter(s => s.startsWith('type-'))
        .map(s => s.replace('type-', ''));
      
      console.log("DEBUG: Catalog preview request:", { sections, categoryIds, extractedProductTypes, applicationCategory, brandName });

      const contentPages = sections.includes("content")
        ? await db
            .select()
            .from(contentPagesTable)
            .where(
              selectedContentPageIds.length > 0
                ? inArray(contentPagesTable.id, selectedContentPageIds)
                : undefined,
            )
            .orderBy(asc(contentPagesTable.sortOrder))
        : [];

      // Logic: If we have specific product types selected, we generate pages BY TYPE.
      // If no product types are selected but categories are, we generate pages BY CATEGORY.
      
      let catalogSections: any[] = [];

      if (extractedProductTypes.length > 0) {
        // Mode A: Product Type Wise Export (Modern Master Data approach)
        catalogSections = await Promise.all(
          extractedProductTypes.map(async (typeName) => {
            const conditions = [eq(productsTable.productType, typeName)];
            if (applicationCategory) conditions.push(eq(productsTable.applicationCategory, applicationCategory));
            if (brandName) conditions.push(eq(productsTable.brandName, brandName));
            
            const products = await db.select().from(productsTable).where(and(...conditions)).orderBy(productsTable.brandName, productsTable.modelName);
            return { id: typeName, name: typeName, products };
          })
        );
      } else if (categoryIds.length > 0) {
        // Mode B: Legacy Category Wise Export
        const cats = await db.select().from(categoriesTable).where(inArray(categoriesTable.id, categoryIds));
        catalogSections = await Promise.all(
          cats.map(async (cat) => {
            const conditions = [eq(productsTable.categoryId, cat.id)];
            if (productType) conditions.push(eq(productsTable.productType, productType));
            if (applicationCategory) conditions.push(eq(productsTable.applicationCategory, applicationCategory));
            if (brandName) conditions.push(eq(productsTable.brandName, brandName));
            
            const products = await db.select().from(productsTable).where(and(...conditions)).orderBy(productsTable.brandName, productsTable.modelName);
            return { id: cat.id, name: cat.name, slug: cat.slug, products };
          })
        );
      }

      const index = sections.includes("index") ? await (async () => {
        const productsForIndex = catalogSections.flatMap(c => c.products);
        const brandMap = new Map<string, Map<string, any[]>>();
        for (const product of productsForIndex) {
          const brand = product.brandName || "Unknown";
          const size = product.size || "Unknown";
          if (!brandMap.has(brand)) brandMap.set(brand, new Map());
          const sizeMap = brandMap.get(brand)!;
          if (!sizeMap.has(size)) sizeMap.set(size, []);
          sizeMap.get(size)!.push(product);
        }
        return Array.from(brandMap.entries()).map(([brand, sizeMap]) => ({
          brand,
          sizes: Array.from(sizeMap.entries()).map(([size, prods]) => ({ size, products: prods })),
        }));
      })() : [];

      res.json({ contentPages, categories: catalogSections, index, sections });
  } catch (err: any) {
    console.error("DEBUG: Catalog preview error:", err);
    res.status(500).json({ error: err.message });
  }
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
