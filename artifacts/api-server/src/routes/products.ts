import { Router, type IRouter } from "express";
import { db, productsTable, categoriesTable } from "@workspace/db";
import { eq, ilike, and, sql, or } from "drizzle-orm";
import { logActivity } from "../lib/activity-logger";

const router: IRouter = Router();

router.get("/products", async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const search = req.query.search as string | undefined;
  const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
  const vehicleBrand = req.query.vehicleBrand as string | undefined;

  const conditions = [];
  if (categoryId) conditions.push(eq(productsTable.categoryId, categoryId));
  if (vehicleBrand) conditions.push(ilike(productsTable.vehicleBrand, `%${vehicleBrand}%`));
  if (search) {
    conditions.push(
      or(
        ilike(productsTable.name, `%${search}%`),
        ilike(productsTable.skuCode, `%${search}%`),
        ilike(productsTable.kcplCode, `%${search}%`),
        ilike(productsTable.vehicleBrand, `%${search}%`),
        ilike(productsTable.engineBrand, `%${search}%`),
      )
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(productsTable)
    .where(where);

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
    .orderBy(productsTable.id)
    .limit(limit)
    .offset(offset);

  res.json({ products, total, page, limit, totalPages: Math.ceil(total / limit) });
});

router.get("/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [product] = await db
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
    .where(eq(productsTable.id, id));
  if (!product) { res.status(404).json({ error: "Not found" }); return; }
  res.json(product);
});

router.post("/products", async (req, res) => {
  const { categoryId, name, skuCode, kcplCode, vehicleBrand, engineBrand, productType, size, imageUrl, specifications } = req.body;
  const [product] = await db.insert(productsTable).values({ categoryId, name, skuCode, kcplCode, vehicleBrand, engineBrand, productType, size, imageUrl, specifications }).returning();
  await logActivity({ action: "Created", entityType: "Product", entityId: product.id, details: `Product "${name || skuCode || 'New SKU'}" created` });
  res.status(201).json({ ...product, categoryName: null });
});

router.put("/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { categoryId, name, skuCode, kcplCode, vehicleBrand, engineBrand, productType, size, imageUrl, specifications } = req.body;
  const [product] = await db.update(productsTable).set({ categoryId, name, skuCode, kcplCode, vehicleBrand, engineBrand, productType, size, imageUrl, specifications, updatedAt: new Date() }).where(eq(productsTable.id, id)).returning();
  if (!product) { res.status(404).json({ error: "Not found" }); return; }
  await logActivity({ action: "Updated", entityType: "Product", entityId: id, details: `Product "${name || skuCode || 'SKU'}" updated` });
  const [{ catName }] = await db.select({ catName: categoriesTable.name }).from(categoriesTable).where(eq(categoriesTable.id, product.categoryId));
  res.json({ ...product, categoryName: catName });
});

router.delete("/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id));
  if (!product) { res.status(404).json({ error: "Not found" }); return; }
  await db.delete(productsTable).where(eq(productsTable.id, id));
  await logActivity({ action: "Deleted", entityType: "Product", entityId: id, details: `Product "${product.name || product.skuCode || 'SKU'}" deleted` });
  res.status(204).send();
});

export default router;
