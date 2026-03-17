import { Router, type IRouter } from "express";
import { db, brandsTable, applicationCategoriesTable, productTypesTable } from "@workspace/db";
import { eq, asc, and } from "drizzle-orm";
import { authenticate, requirePermission } from "../middleware/auth";

const router: IRouter = Router();

// Brands
router.get("/brands", authenticate, async (req, res): Promise<any> => {
  try {
    const productTypeId = req.query.productTypeId ? Number(req.query.productTypeId) : undefined;
    const applicationCategoryId = req.query.applicationCategoryId ? Number(req.query.applicationCategoryId) : undefined;
    
    const conditions = [];
    if (productTypeId) conditions.push(eq(brandsTable.productTypeId, productTypeId));
    if (applicationCategoryId) conditions.push(eq(brandsTable.applicationCategoryId, applicationCategoryId));
    
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const brands = await db.select().from(brandsTable).where(where).orderBy(asc(brandsTable.name));
    return res.json(brands);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to fetch brands", message: err.message });
  }
});

router.post("/brands", authenticate, requirePermission("products:write"), async (req, res): Promise<any> => {
  try {
    const { name, productTypeId, applicationCategoryId } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    if (!productTypeId) return res.status(400).json({ error: "Product Type ID is required" });
    if (!applicationCategoryId) return res.status(400).json({ error: "Application Category ID is required" });
    
    await db.insert(brandsTable).values({ 
      name, 
      productTypeId: Number(productTypeId), 
      applicationCategoryId: Number(applicationCategoryId) 
    }).onDuplicateKeyUpdate({ set: { name } });
    
    const [brand] = await db.select().from(brandsTable).where(and(
      eq(brandsTable.name, name),
      eq(brandsTable.productTypeId, Number(productTypeId)),
      eq(brandsTable.applicationCategoryId, Number(applicationCategoryId))
    ));
    return res.status(201).json(brand);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to create brand", message: err.message });
  }
});

router.delete("/brands/:id", authenticate, requirePermission("products:write"), async (req, res): Promise<any> => {
  try {
    const id = Number(req.params.id);
    await db.delete(brandsTable).where(eq(brandsTable.id, id));
    return res.status(204).send();
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to delete brand", message: err.message });
  }
});

// Application Categories
router.get("/application-categories", authenticate, async (req, res): Promise<any> => {
  try {
    const productTypeId = req.query.productTypeId ? Number(req.query.productTypeId) : undefined;
    const where = productTypeId ? eq(applicationCategoriesTable.productTypeId, productTypeId) : undefined;
    
    const cats = await db.select().from(applicationCategoriesTable).where(where).orderBy(asc(applicationCategoriesTable.name));
    return res.json(cats);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to fetch application categories", message: err.message });
  }
});

router.post("/application-categories", authenticate, requirePermission("products:write"), async (req, res): Promise<any> => {
  try {
    const { name, productTypeId } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    if (!productTypeId) return res.status(400).json({ error: "Product Type ID is required" });
    
    await db.insert(applicationCategoriesTable).values({ 
      name, 
      productTypeId: Number(productTypeId) 
    }).onDuplicateKeyUpdate({ set: { name } });
    
    const [cat] = await db.select().from(applicationCategoriesTable).where(and(
      eq(applicationCategoriesTable.name, name),
      eq(applicationCategoriesTable.productTypeId, Number(productTypeId))
    ));
    return res.status(201).json(cat);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to create application category", message: err.message });
  }
});

router.delete("/application-categories/:id", authenticate, requirePermission("products:write"), async (req, res): Promise<any> => {
  try {
    const id = Number(req.params.id);
    await db.delete(applicationCategoriesTable).where(eq(applicationCategoriesTable.id, id));
    return res.status(204).send();
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to delete application category", message: err.message });
  }
});

// Product Types
router.get("/product-types", authenticate, async (_req, res): Promise<any> => {
  try {
    const types = await db.select().from(productTypesTable).orderBy(asc(productTypesTable.name));
    return res.json(types);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to fetch product types", message: err.message });
  }
});

router.post("/product-types", authenticate, requirePermission("products:write"), async (req, res): Promise<any> => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    
    await db.insert(productTypesTable).values({ name }).onDuplicateKeyUpdate({ set: { name } });
    const [type] = await db.select().from(productTypesTable).where(eq(productTypesTable.name, name));
    return res.status(201).json(type);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to create product type", message: err.message });
  }
});

router.delete("/product-types/:id", authenticate, requirePermission("products:write"), async (req, res): Promise<any> => {
  try {
    const id = Number(req.params.id);
    await db.delete(productTypesTable).where(eq(productTypesTable.id, id));
    return res.status(204).send();
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to delete product type", message: err.message });
  }
});

export default router;
