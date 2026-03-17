import { Router, type IRouter } from "express";
import { db, productsTable, categoriesTable, brandsTable, applicationCategoriesTable, productTypesTable } from "@workspace/db";
import { eq, like, and, sql, or, desc } from "drizzle-orm";
import { logActivity } from "../lib/activity-logger";
import { authenticate, requirePermission } from "../middleware/auth";

const router: IRouter = Router();
// Allow larger inline image payloads (e.g. base64 Data URLs). Longtext in MySQL
// supports very large values; keep a reasonable server-side guard to avoid
// accidental huge payloads. Increase to ~5MB for typical base64 images.
const MAX_IMAGE_URL_LENGTH = 5_000_000;

router.get("/products/filters", authenticate, async (req, res) => {
  try {
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
    const applicationCategory = req.query.applicationCategory as string | undefined;
    const productType = req.query.productType as string | undefined;

    const conditions = [];
    if (categoryId) {
      conditions.push(eq(productsTable.categoryId, categoryId));
    }
    if (productType && productType !== "all") {
      const searchVal = productType.endsWith('s') ? productType.slice(0, -1) : productType;
      conditions.push(or(
        eq(productsTable.productType, productType),
        like(productsTable.productType, `%${searchVal}%`),
        like(productsTable.categoryName, `%${searchVal}%`)
      ));
    } else if (!categoryId) {
      conditions.push(or(
        sql`${productsTable.productType} IS NOT NULL AND ${productsTable.productType} != ''`,
        sql`${productsTable.categoryName} IS NOT NULL AND ${productsTable.categoryName} != ''`
      ));
    }

    if (applicationCategory) conditions.push(eq(productsTable.applicationCategory, applicationCategory));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [appCatsProduct, typesProduct, brandsProduct] = await Promise.all([
      db.selectDistinct({ value: productsTable.applicationCategory })
        .from(productsTable)
        .where(and(where, sql`${productsTable.applicationCategory} IS NOT NULL`)),
      db.selectDistinct({ value: productsTable.productType })
        .from(productsTable)
        .where(and(where, sql`${productsTable.productType} IS NOT NULL`)),
      db.selectDistinct({ value: productsTable.brandName })
        .from(productsTable)
        .where(and(where, sql`${productsTable.brandName} IS NOT NULL`))
    ]);

    // Also fetch from master tables with hierarchy awareness
    let typeIdMatch: number | undefined;
    let catIdMatch: number | undefined;

    if (productType) {
      const [type] = await db.select({ id: productTypesTable.id }).from(productTypesTable).where(eq(productTypesTable.name, productType));
      if (type) typeIdMatch = type.id;
    }

    if (applicationCategory && typeIdMatch) {
      const [cat] = await db.select({ id: applicationCategoriesTable.id })
        .from(applicationCategoriesTable)
        .where(and(eq(applicationCategoriesTable.name, applicationCategory), eq(applicationCategoriesTable.productTypeId, typeIdMatch)));
      if (cat) catIdMatch = cat.id;
    }

    const [appCatsMaster, typesMaster, brandsMaster] = await Promise.all([
      db.select({ value: applicationCategoriesTable.name })
        .from(applicationCategoriesTable)
        .where(typeIdMatch ? eq(applicationCategoriesTable.productTypeId, typeIdMatch) : undefined),
      db.select({ value: productTypesTable.name }).from(productTypesTable),
      db.select({ value: brandsTable.name })
        .from(brandsTable)
        .where(and(
          typeIdMatch ? eq(brandsTable.productTypeId, typeIdMatch) : undefined,
          catIdMatch ? eq(brandsTable.applicationCategoryId, catIdMatch) : undefined
        ))
    ]);

    const merge = (prod: any[], master: any[]) => {
      const allValues = [...prod.map(r => r.value), ...master.map(r => r.value)]
        .filter(Boolean)
        .map(v => String(v).trim());
      
      // Use a Map to deduplicate case-insensitively while preserving one version
      const uniqueMap = new Map();
      allValues.forEach(v => {
        const lower = v.toLowerCase();
        if (!uniqueMap.has(lower)) {
          uniqueMap.set(lower, v);
        }
      });
      
      return Array.from(uniqueMap.values()).sort((a, b) => a.localeCompare(b));
    };

    res.json({
      applicationCategories: merge(appCatsProduct, appCatsMaster),
      productTypes: merge(typesProduct, typesMaster),
      brands: merge(brandsProduct, brandsMaster),
    });
  } catch (err: any) {
    console.error("DEBUG: Filter fetch error:", err);
    res.status(500).json({ error: "Failed to fetch filters", message: err.message });
  }
});

router.get("/products", authenticate, async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const search = req.query.search as string | undefined;
  const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
  const applicationCategory = req.query.applicationCategory as string | undefined;
  const productType = req.query.productType as string | undefined;
  const brandName = req.query.brandName as string | undefined;

  const conditions = [];
  if (categoryId) {
    conditions.push(eq(productsTable.categoryId, categoryId));
  }
  if (productType && productType !== "all") {
    const searchVal = productType.endsWith('s') ? productType.slice(0, -1) : productType;
    conditions.push(or(
      eq(productsTable.productType, productType),
      like(productsTable.productType, `%${searchVal}%`),
      like(productsTable.categoryName, `%${searchVal}%`)
    ));
  } else if (!categoryId) {
    // If no specific category or type is requested, show products that have either field
    conditions.push(or(
      sql`${productsTable.productType} IS NOT NULL AND ${productsTable.productType} != ''`,
      sql`${productsTable.categoryName} IS NOT NULL AND ${productsTable.categoryName} != ''`
    ));
  }
  
  if (applicationCategory) {
    conditions.push(eq(productsTable.applicationCategory, applicationCategory));
  }

  if (brandName) conditions.push(like(productsTable.brandName, `%${brandName}%`));
  if (search) {
    conditions.push(
      or(
        like(productsTable.kcplCode, `%${search}%`),
        like(productsTable.brandName, `%${search}%`),
        like(productsTable.modelName, `%${search}%`),
        like(productsTable.productType, `%${search}%`),
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
    .orderBy(desc(productsTable.id))
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
    .where(eq(productsTable.id, id));
  if (!product) { res.status(404).json({ error: "Not found" }); return; }
  const imageTruncated = typeof product.imageUrl === 'string' && product.imageUrl.length === 65535;
  res.json({ ...product, imageTruncated });
});

router.post("/products", authenticate, requirePermission("products:write"), async (req, res) => {
  try {
    let { categoryId, categoryName, applicationCategory, productType, brandName, kcplCode, modelName, size, adaptablePartNo, imageUrl, specifications } = req.body;
    
    let numericCategoryId = categoryId ? Number(categoryId) : null;
    
    // If we have a productType but no categoryId, we can still proceed
    if (!numericCategoryId && !productType) {
      res.status(400).json({ error: "Product Type or Category is required" });
      return;
    }

    if (numericCategoryId && !categoryName) {
      const cats = await db.select({ name: categoriesTable.name })
        .from(categoriesTable)
        .where(eq(categoriesTable.id, numericCategoryId));
      if (cats.length > 0) {
        categoryName = cats[0].name;
      }
    }

    // Default categoryName to productType if still missing
    if (!categoryName && productType) {
      categoryName = productType;
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

    console.log(`DEBUG: Saving product for category ${numericCategoryId}, kcplCode: ${kcplCode}`);

    // Check if product with this kcplCode already exists for Upsert-like behavior
    let existingProduct: any = null;
    if (kcplCode) {
      const [p] = await db.select().from(productsTable).where(eq(productsTable.kcplCode, kcplCode)).limit(1);
      existingProduct = p;
    }

    const data: any = {
      categoryId: numericCategoryId,
      categoryName: categoryName || null,
      applicationCategory: applicationCategory || null,
      productType: productType || null,
      brandName: brandName || null,
      kcplCode: kcplCode || null,
      modelName: modelName || null,
      size: size || null,
      adaptablePartNo: adaptablePartNo || null,
      imageUrl: imageUrl || null,
      specifications: specifications || null,
      updatedAt: sql`NOW()`
    };

    let resultId: number;

    if (existingProduct) {
      console.log(`DEBUG: Product ${kcplCode} exists (ID: ${existingProduct.id}), updating...`);
      await db.update(productsTable).set(data).where(eq(productsTable.id, existingProduct.id));
      resultId = existingProduct.id;
    } else {
      console.log(`DEBUG: Creating new product...`);
      const [insertResult] = await (db.insert(productsTable).values({
        ...data,
        createdAt: sql`NOW()`,
      }) as any).execute();
      
      resultId = insertResult.insertId;
      if (!resultId) {
        // Fallback for returning id logic
        const [p] = await db.select({ id: productsTable.id }).from(productsTable).where(eq(productsTable.kcplCode, kcplCode as string)).limit(1);
        resultId = p?.id;
      }
    }

    if (!resultId) {
      console.error('ERROR: Could not resolve product ID');
      res.status(500).json({ error: "Failed to save product" });
      return;
    }

    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, resultId));
    
    if (!product) {
      console.error('ERROR: Could not retrieve product after save');
      res.status(500).json({ error: "Product saved but could not be retrieved" });
      return;
    }

    await logActivity({ 
      action: existingProduct ? "Updated" : "Created", 
      entityType: "Product", 
      entityId: product.id, 
      details: `Product "${product.kcplCode || 'New SKU'}" ${existingProduct ? 'updated via upsert' : 'created'}` 
    });

    res.status(existingProduct ? 200 : 201).json(product);
  } catch (err: any) {
    console.error("ERROR: Product save process failed:", err);
    
    // Fallback if manual check missed something (e.g. race condition)
    if (err?.code === "ER_DUP_ENTRY" || err?.message?.includes("Duplicate entry")) {
      res.status(409).json({ error: "Duplicate KCPL Code", message: "A product with this KCPL Code already exists." });
      return;
    }
    
    if (err?.code === "ER_NET_PACKET_TOO_LARGE" || /max_allowed_packet/i.test(err?.message || "")) {
      res.status(413).json({ error: "Image data is too large. Please upload a smaller image or use a URL." });
      return;
    }
    res.status(500).json({ error: "Save Failed", message: err.message });
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
      categoryId, categoryName, applicationCategory, productType, brandName, kcplCode, modelName, size, adaptablePartNo, imageUrl, specifications 
    } = req.body;
    
    console.log(`DEBUG: Updating product ${id}.`);
    
    const updateData: any = {
      updatedAt: sql`NOW()`
    };
    
    if (categoryId !== undefined) {
      const numericCategoryId = categoryId ? Number(categoryId) : null;
      updateData.categoryId = numericCategoryId;
      
      if (numericCategoryId && !categoryName) {
         const cats = await db.select({ name: categoriesTable.name })
           .from(categoriesTable)
           .where(eq(categoriesTable.id, numericCategoryId));
         if (cats.length > 0) {
           updateData.categoryName = cats[0].name;
         }
      }
    }
    
    if (categoryName !== undefined && categoryName !== null && categoryName !== "") {
      updateData.categoryName = categoryName;
    }

    if (applicationCategory !== undefined) updateData.applicationCategory = applicationCategory || null;
    if (productType !== undefined) updateData.productType = productType || null;
    if (brandName !== undefined) updateData.brandName = brandName || null;
    if (kcplCode !== undefined) updateData.kcplCode = kcplCode || null;
    if (modelName !== undefined) updateData.modelName = modelName || null;
    if (size !== undefined) updateData.size = size || null;
    if (adaptablePartNo !== undefined) updateData.adaptablePartNo = adaptablePartNo || null;

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
      details: `Product "${product.kcplCode || 'SKU'}" updated` 
    });

    res.json(product);
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
    await logActivity({ action: "Deleted", entityType: "Product", entityId: id, details: `Product "${product.kcplCode || 'SKU'}" deleted` });
    res.status(204).send();
  } catch (err: any) {
    console.error("ERROR: Product delete failed:", err);
    res.status(500).json({ error: err.message || "Failed to delete product" });
  }
});

export default router;
