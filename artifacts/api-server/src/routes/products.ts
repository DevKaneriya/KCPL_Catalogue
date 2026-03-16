import { Router, type IRouter } from "express";
import { db, productsTable, categoriesTable } from "@workspace/db";
import { eq, like, and, sql, or, desc } from "drizzle-orm";
import { logActivity } from "../lib/activity-logger";
import { authenticate, requirePermission } from "../middleware/auth";

const router: IRouter = Router();
// Allow larger inline image payloads (e.g. base64 Data URLs). Longtext in MySQL
// supports very large values; keep a reasonable server-side guard to avoid
// accidental huge payloads. Increase to ~5MB for typical base64 images.
const MAX_IMAGE_URL_LENGTH = 5_000_000;

router.get("/products", authenticate, async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const search = req.query.search as string | undefined;
  const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
  const vehicleBrand = req.query.vehicleBrand as string | undefined;

  const conditions = [];
  if (categoryId) conditions.push(eq(productsTable.categoryId, categoryId));
  if (vehicleBrand) conditions.push(like(productsTable.vehicleBrand, `%${vehicleBrand}%`));
  if (search) {
    conditions.push(
      or(
        like(productsTable.name, `%${search}%`),
        like(productsTable.skuCode, `%${search}%`),
        like(productsTable.kcplCode, `%${search}%`),
        like(productsTable.vehicleBrand, `%${search}%`),
        like(productsTable.engineBrand, `%${search}%`),
      )
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)` })
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

  // Mark potentially truncated images (previous schema used TEXT -> 65535 limit)
  const productsWithFlag = products.map(p => ({
    ...p,
    imageTruncated: typeof p.imageUrl === 'string' && p.imageUrl.length === 65535
  }));

  res.json({ products: productsWithFlag, total, page, limit, totalPages: Math.ceil(total / limit) });
});

router.get("/products/:id", authenticate, async (req, res) => {
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
  const imageTruncated = typeof product.imageUrl === 'string' && product.imageUrl.length === 65535;
  res.json({ ...product, imageTruncated });
});

router.post("/products", authenticate, requirePermission("products:write"), async (req, res) => {
  try {
    let { categoryId, name, skuCode, kcplCode, vehicleBrand, engineBrand, productType, size, imageUrl, specifications } = req.body;
    
    console.log('DEBUG POST /products: Received body:', { categoryId, name, skuCode, kcplCode, vehicleBrand, engineBrand, productType, size, imageUrl: imageUrl ? 'present' : 'null', specifications: typeof specifications });
    
    const numericCategoryId = Number(categoryId);
    if (!categoryId || isNaN(numericCategoryId)) {
      res.status(400).json({ error: "Valid category ID is required" });
      return;
    }
    if (typeof imageUrl === "string" && imageUrl.length > MAX_IMAGE_URL_LENGTH) {
      res.status(413).json({ error: "Image data is too large. Please upload a smaller image or use a URL." });
      return;
    }
    if (typeof specifications === "string") {
      try {
        specifications = JSON.parse(specifications);
      } catch {
        specifications = null;
      }
    }

    console.log(`DEBUG: Creating product for category ${numericCategoryId}`);

    const inserted = await db.insert(productsTable).values({ 
      categoryId: numericCategoryId, 
      name: name || null, 
      skuCode: skuCode || null, 
      kcplCode: kcplCode || null, 
      vehicleBrand: vehicleBrand || null, 
      engineBrand: engineBrand || null, 
      productType: productType || null, 
      size: size || null, 
      imageUrl: imageUrl || null, 
      specifications: specifications || null,
      createdAt: sql`NOW()`,
      updatedAt: sql`NOW()`
    }).$returningId();

    const insertId = inserted[0]?.id;
    if (!insertId) {
      console.error('ERROR: Insert did not return id');
      res.status(500).json({ error: "Product created but insert id missing" });
      return;
    }
    console.log('DEBUG: Inserted product with id:', insertId);
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, insertId));
    
    if (!product) {
      console.error('ERROR: Could not retrieve product after insert');
      res.status(500).json({ error: "Product created but could not be retrieved" });
      return;
    }

    await logActivity({ 
      action: "Created", 
      entityType: "Product", 
      entityId: product.id, 
      details: `Product "${product.name || product.skuCode || 'New SKU'}" created` 
    });

    // Resolve category name for the created product so frontend shows it immediately
    const cats = await db.select({ catName: categoriesTable.name })
      .from(categoriesTable)
      .where(eq(categoriesTable.id, product.categoryId));
    const catName = cats.length > 0 ? cats[0].catName : null;

    res.status(201).json({ ...product, categoryName: catName });
  } catch (err: any) {
    console.error("ERROR: Product creation failed:", err);
    if (err?.code === "ER_NET_PACKET_TOO_LARGE" || /max_allowed_packet/i.test(err?.message || "")) {
      res.status(413).json({ error: "Image data is too large. Please upload a smaller image or use a URL." });
      return;
    }
    res.status(500).json({ error: "Creation Failed", message: err.message });
  }
});

router.put("/products/:id", authenticate, requirePermission("products:write"), async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid product ID" });
    return;
  }

  try {
    const { 
      categoryId, name, skuCode, kcplCode, vehicleBrand, engineBrand, 
      productType, size, imageUrl, specifications 
    } = req.body;
    
    console.log('DEBUG PUT /products:', id, 'Received body:', { categoryId, name, skuCode, kcplCode, vehicleBrand, engineBrand, productType, size, imageUrl: imageUrl ? 'present' : 'null', specifications: typeof specifications });
    
    console.log(`DEBUG: Updating product ${id}.`);
    
    const updateData: any = {
      updatedAt: sql`NOW()`
    };
    
    if (categoryId !== undefined) {
      const numericCategoryId = Number(categoryId);
      if (!Number.isFinite(numericCategoryId)) {
        res.status(400).json({ error: "Valid category ID is required" });
        return;
      }
      updateData.categoryId = numericCategoryId;
    }
    if (name !== undefined) updateData.name = name || null;
    if (skuCode !== undefined) updateData.skuCode = skuCode || null;
    if (kcplCode !== undefined) updateData.kcplCode = kcplCode || null;
    if (vehicleBrand !== undefined) updateData.vehicleBrand = vehicleBrand || null;
    if (engineBrand !== undefined) updateData.engineBrand = engineBrand || null;
    if (productType !== undefined) updateData.productType = productType || null;
    if (size !== undefined) updateData.size = size || null;
    if (imageUrl !== undefined) {
      if (typeof imageUrl === "string" && imageUrl.length > MAX_IMAGE_URL_LENGTH) {
        res.status(413).json({ error: "Image data is too large. Please upload a smaller image or use a URL." });
        return;
      }
      updateData.imageUrl = imageUrl || null;
    }
    if (specifications !== undefined) {
      if (typeof specifications === "string") {
        try {
          updateData.specifications = JSON.parse(specifications);
        } catch {
          updateData.specifications = null;
        }
      } else {
        updateData.specifications = specifications || null;
      }
    }

    console.log('DEBUG: Update data:', updateData);
    const result = await db.update(productsTable)
      .set(updateData)
      .where(eq(productsTable.id, id));

    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id));
    if (!product) { 
      console.error('ERROR: Product not found after update');
      res.status(404).json({ error: "Product not found" }); 
      return; 
    }

    await logActivity({ 
      action: "Updated", 
      entityType: "Product", 
      entityId: id, 
      details: `Product "${product.name || product.skuCode || 'SKU'}" updated` 
    });

    const cats = await db.select({ catName: categoriesTable.name })
      .from(categoriesTable)
      .where(eq(categoriesTable.id, product.categoryId));
    const catName = cats.length > 0 ? cats[0].catName : null;
    
    res.json({ ...product, categoryName: catName });
  } catch (err: any) {
    console.error("CRITICAL: Product update failed!");
    console.error("Error Code:", err.code);
    console.error("Error Message:", err.message);
    if (err.sqlMessage) console.error("SQL Message:", err.sqlMessage);

    if (err?.code === "ER_NET_PACKET_TOO_LARGE" || /max_allowed_packet/i.test(err?.message || "")) {
      res.status(413).json({ error: "Image data is too large. Please upload a smaller image or use a URL." });
      return;
    }
    
    res.status(500).json({ 
      error: "Database Update Error", 
      message: err.message,
      code: err.code,
      sqlMessage: err.sqlMessage
    });
  }
});

router.delete("/products/:id", authenticate, requirePermission("products:delete"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid product ID" }); return; }
  try {
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id));
    if (!product) { res.status(404).json({ error: "Not found" }); return; }
    await db.delete(productsTable).where(eq(productsTable.id, id));
    await logActivity({ action: "Deleted", entityType: "Product", entityId: id, details: `Product "${product.name || product.skuCode || 'SKU'}" deleted` });
    res.status(204).send();
  } catch (err: any) {
    console.error("ERROR: Product delete failed:", err);
    res.status(500).json({ error: err.message || "Failed to delete product" });
  }
});

export default router;
