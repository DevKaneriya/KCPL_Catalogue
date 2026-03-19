import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useGetCatalogPreviewData, useGetProductTypesMaster, useListContentPages, exportCatalog } from "@workspace/api-client-react";

type CatalogPreviewData = {
  contentPages?: any[];
  categories?: any[];
  index?: any[];
  sections?: string[];
};
import { Download, Loader2, CheckCircle2, ChevronRight, ChevronLeft, Eye, Settings2, Printer, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

const normalizeKey = (value?: string | null) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const canonicalKey = (value?: string | null) => normalizeKey(value).replace(/s$/, "");

const matchesCategoryValue = (value?: string | null, target?: string | null) => {
  const left = normalizeKey(value);
  const right = normalizeKey(target);
  if (!left || !right) return false;
  return left === right || canonicalKey(left) === canonicalKey(right);
};

export default function ExportCatalog() {
  const { data: contentPages } = useListContentPages();
  const { data: masterProductTypes } = useGetProductTypesMaster();
  const previewMutation = useGetCatalogPreviewData();
  const { toast } = useToast();

  const [searchParams] = useState(() => new URLSearchParams(window.location.search));
  const sourceCategory = searchParams.get("category");
  const appCategory = searchParams.get('appCategory');
  const brand = searchParams.get('brand');
  const productType = searchParams.get('productType');
  const isFromAllProducts = !sourceCategory || matchesCategoryValue(sourceCategory, "all");

  const activeSourceType = useMemo(() => {
    if (!masterProductTypes?.length) return null;
    const byProductType = productType && productType !== "all"
      ? masterProductTypes.find((type) => matchesCategoryValue(type.name, productType))
      : null;
    if (byProductType) return byProductType;

    if (!isFromAllProducts && sourceCategory) {
      return (
        masterProductTypes.find((type) => matchesCategoryValue(type.name, sourceCategory)) ||
        null
      );
    }

    return null;
  }, [masterProductTypes, productType, isFromAllProducts, sourceCategory]);

  const [step, setStep] = useState(1);
  const [selectedTypeNames, setSelectedTypeNames] = useState<string[]>([]);
  const [selectedContentPageIds, setSelectedContentPageIds] = useState<number[]>([]);
  const [includeIndexPages, setIncludeIndexPages] = useState(true);
  const [activeContentPreset, setActiveContentPreset] = useState<string | null>(null);
  const [hasInitializedTypes, setHasInitializedTypes] = useState(false);
  const [hasInitializedPages, setHasInitializedPages] = useState(false);

  const sortedContentPages = useMemo(() => {
    if (!Array.isArray(contentPages)) return [];
    return [...contentPages].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [contentPages]);

  const visibleContentPages = useMemo(() => {
    if (isFromAllProducts) return sortedContentPages;

    const sourceTypeName = activeSourceType?.name || sourceCategory || productType;
    return sortedContentPages.filter((page) => {
      const pageCategory = page.category || "all";
      return (
        matchesCategoryValue(pageCategory, "all") ||
        matchesCategoryValue(pageCategory, sourceTypeName)
      );
    });
  }, [sortedContentPages, isFromAllProducts, activeSourceType, sourceCategory, productType]);

  const allVisibleContentPageIds = useMemo(
    () => visibleContentPages.map((page) => page.id),
    [visibleContentPages],
  );

  const getDefaultPageIdsForType = (typeName: string) =>
    visibleContentPages
      .filter(
        (page) =>
          matchesCategoryValue(page.category, "all") ||
          matchesCategoryValue(page.category, typeName),
      )
      .map((page) => page.id);

  useEffect(() => {
    if (hasInitializedTypes || !masterProductTypes?.length) return;

    if (isFromAllProducts) {
      setSelectedTypeNames(masterProductTypes.map((type) => type.name));
    } else if (activeSourceType?.name) {
      setSelectedTypeNames([activeSourceType.name]);
    } else if (productType && productType !== "all") {
      setSelectedTypeNames([productType]);
    }

    setIncludeIndexPages(true);
    setHasInitializedTypes(true);
  }, [
    hasInitializedTypes,
    masterProductTypes,
    isFromAllProducts,
    activeSourceType,
    productType,
  ]);

  useEffect(() => {
    if (hasInitializedPages || !hasInitializedTypes || !Array.isArray(contentPages)) return;

    if (isFromAllProducts) {
      setSelectedContentPageIds(allVisibleContentPageIds);
      setActiveContentPreset("preset-all-pages");
      setHasInitializedPages(true);
      return;
    }

    const sourceTypeName = activeSourceType?.name || sourceCategory || productType;
    const defaultPageIds = sourceTypeName
      ? getDefaultPageIdsForType(sourceTypeName)
      : allVisibleContentPageIds;
    setSelectedContentPageIds(defaultPageIds);
    setActiveContentPreset(
      sourceTypeName ? `preset-default-${normalizeKey(sourceTypeName)}` : "preset-default",
    );
    setHasInitializedPages(true);
  }, [
    hasInitializedPages,
    hasInitializedTypes,
    contentPages,
    isFromAllProducts,
    allVisibleContentPageIds,
    activeSourceType,
    sourceCategory,
    productType,
  ]);

  const [previewData, setPreviewData] = useState<CatalogPreviewData | null>(null);
  const [customPageContents, setCustomPageContents] = useState<Record<number, string>>({});
  const [isDone, setIsDone] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const PRODUCTS_PER_PAGE = 12;
  const INDEX_ROWS_PER_PAGE = 30;

  const totalSheets = useMemo(() => {
    if (!previewData) return 0;
    const contentCount = previewData.contentPages?.length || 0;
    const cats = previewData.categories || [];
    const catSheets = cats.reduce((acc, cat) => acc + Math.max(1, Math.ceil(cat.products.length / PRODUCTS_PER_PAGE)), 0);
    
    let indexSheets = 0;
    let detailSheets = 0;
    if (includeIndexPages) {
        let totalTOCRows = 0;
        const brandsOverall = new Set<string>();
        const totalProducts = cats.reduce((acc, c) => acc + (c.products?.length || 0), 0);
        
        cats.forEach(cat => {
          const brands = new Set(cat.products?.map((p: any) => p.brandName || "Other"));
          totalTOCRows += (1 + brands.size);
          brands.forEach((b: any) => brandsOverall.add(b.toUpperCase()));
        });
        
        indexSheets = Math.max(1, Math.ceil(totalTOCRows / 24));
        
        let totalDetailRowsCount = 0;
        cats.forEach(cat => {
            totalDetailRowsCount += 1; // Type header
            const appCats = new Set(cat.products?.map((p: any) => p.applicationCategory || "General"));
            totalDetailRowsCount += appCats.size;
            const brandsByCat = new Set(cat.products?.map((p: any) => p.brandName || "Other"));
            totalDetailRowsCount += (brandsByCat.size * 2); // Header row + Badge row
            totalDetailRowsCount += (cat.products?.length || 0);
        });
        detailSheets = Math.max(1, Math.ceil(totalDetailRowsCount / 15));
    }
    
    return 1 + contentCount + indexSheets + detailSheets + catSheets;
  }, [previewData, includeIndexPages]);

  const toggleType = (typeName: string) => {
    setSelectedTypeNames((prev) =>
      prev.includes(typeName)
        ? prev.filter((name) => name !== typeName)
        : [...prev, typeName],
    );
  };

  const toggleContentPage = (pageId: number) => {
    setActiveContentPreset(null);
    setSelectedContentPageIds((prev) =>
      prev.includes(pageId) ? prev.filter((id) => id !== pageId) : [...prev, pageId],
    );
  };

  const applyContentPreset = (presetKey: string, pageIds: number[]) => {
    if (activeContentPreset === presetKey) {
      setActiveContentPreset(null);
      setSelectedContentPageIds([]);
      return;
    }
    setActiveContentPreset(presetKey);
    setSelectedContentPageIds(Array.from(new Set(pageIds)));
  };

  const selectAllTypes = () => {
    setSelectedTypeNames(masterProductTypes?.map((type) => type.name) || []);
  };

  const clearTypes = () => setSelectedTypeNames([]);

  const goToPreview = () => {
    if (selectedTypeNames.length === 0) {
      toast({ title: "Select at least one category", variant: "destructive" });
      return;
    }

    const sections = [
      ...(selectedContentPageIds.length > 0 ? ["content"] : []),
      ...selectedContentPageIds.map((id) => `content-page-${id}`),
      ...(includeIndexPages ? ["index"] : []),
      ...selectedTypeNames.map((name) => `type-${name}`),
    ];

    previewMutation.mutate(
      { data: { 
          sections, 
          applicationCategory: appCategory || undefined, 
          brandName: brand || undefined, 
          productType: selectedTypeNames[0] || (productType || undefined),
      } },
      {
        onSuccess: async (data) => {
          const contents: Record<number, string> = {};
          if (data.contentPages) {
            for (const page of data.contentPages) {
              if (page.type === 'custom') {
                const customSlug = (page as any).slug || normalizeKey(page.title) || `page-${page.id}`;
                try {
                  const res = await fetch(`/custom-pages/${customSlug}.html`);
                  if (res.ok) {
                    const htmlText = await res.text();
                    if (htmlText.includes('<div id="root"></div>')) {
                       throw new Error('Vite SPA Fallback - File truly missing');
                    }
                    
                    // Add modern DOM parsing to clean up the HTML for printing
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(htmlText, 'text/html');
                    
                    // Fix absolute image paths to be fully qualified with origin
                    // This is essential for both the Blob-window print and html2canvas
                    doc.querySelectorAll('img').forEach(img => {
                      const src = img.getAttribute('src');
                      if (src && src.startsWith('/')) {
                        img.setAttribute('src', window.location.origin + src);
                      }
                    });

                    // Extract and scope styles
                    const styles = Array.from(doc.querySelectorAll('style')).map(s => s.textContent).join('\n');
                    
                    // If there's a specific container, use its content to avoid nesting <html> tags
                    const container = doc.querySelector('.custom-page-container') || doc.body;
                    
                    // Wrap with localized styles and ensure max-width doesn't clip on A4
                    contents[page.id] = `
                      <style>
                        ${styles}
                        .custom-page-container { max-width: 100% !important; margin: 0 !important; box-shadow: none !important; background: transparent !important; }
                        .custom-content-wrapper img { max-width: 100%; height: auto; }
                      </style>
                      <div class="custom-content-wrapper">
                        ${container.innerHTML}
                      </div>
                    `;
                  } else {
                    throw new Error('Not found');
                  }
                } catch (e) {
                  contents[page.id] = `<div style="padding: 40px; text-align: center; border: 2px dashed #f43f5e; border-radius: 8px; margin: 20px; font-family: sans-serif; background: #fff1f2;">
                    <h2 style="color: #e11d48; margin-bottom: 15px;">Warning: Custom Page Missing</h2>
                    <p style="color: #334155; line-height: 1.6;">The preview engine attempted to load the manual HTML file for <strong>${page.title}</strong>, but the file doesn't exist.</p>
                    <p style="color: #334155; line-height: 1.6;">To fix this, please explicitly create a file named exactly: <br/><strong style="color: #e11d48; font-size: 16px;">public/custom-pages/${customSlug}.html</strong></p>
                  </div>`;
                }
              }
            }
          }
          setCustomPageContents(contents);
          setPreviewData(data);
          setStep(2);
          setIsDone(false);
        },
        onError: (err: any) => toast({ title: "Failed to load preview", description: err.message, variant: "destructive" })
      }
    );
  };

  const contentPresetOptions = useMemo(() => {
    const options: Array<{ key: string; label: string; pageIds: number[] }> = [
      { key: "preset-all-pages", label: "Select All Pages", pageIds: allVisibleContentPageIds },
    ];

    if (isFromAllProducts) {
      for (const type of masterProductTypes || []) {
        const pageIds = getDefaultPageIdsForType(type.name);
        if (pageIds.length > 0) {
          options.push({
            key: `preset-default-${normalizeKey(type.name)}`,
            label: `Select Default ${type.name} Pages`,
            pageIds,
          });
        }
      }
    } else {
      const sourceTypeName = activeSourceType?.name || sourceCategory || productType || "Category";
      const pageIds = getDefaultPageIdsForType(sourceTypeName);
      options.push({
        key: `preset-default-${normalizeKey(sourceTypeName)}`,
        label: `Select Default ${sourceTypeName} Pages`,
        pageIds,
      });
    }

    return options.filter((option) => option.pageIds.length > 0);
  }, [
    allVisibleContentPageIds,
    isFromAllProducts,
    masterProductTypes,
    activeSourceType,
    sourceCategory,
    productType,
    visibleContentPages,
  ]);

  const buildPrintHTML = (data: CatalogPreviewData, options: { forBrowser?: boolean, includeScript?: boolean, bodyOnly?: boolean } = {}): string => {
    const { forBrowser = false, includeScript = false, bodyOnly = false } = options;
    const cats = data.categories || [];
    const contentPages = data.contentPages || [];
    const indexData = data.index || [];
    const showContent = contentPages.length > 0;
    const showIndex = includeIndexPages && indexData.length > 0;

    const styles = `
      @page { size: A4; margin: 0; }
      * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
      body { font-family: 'Inter', Arial, sans-serif; font-size: 10pt; color: #1a1a1a; background: ${forBrowser ? '#f1f5f9' : 'white'}; }
      .sheet { 
        background: white; 
        box-shadow: ${forBrowser ? '0 10px 15px -3px rgb(0 0 0 / 0.1)' : 'none'}; 
        margin: ${forBrowser ? '20px auto' : '0'};
        padding: 18mm 14mm;
        width: 210mm;
        min-height: 297mm;
        position: relative;
        ${forBrowser ? 'border-radius: 8px;' : ''}
        overflow: hidden;
      }
      .page-break { page-break-after: always; break-after: page; }
      
      /* Cover */
      .cover { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 260mm; text-align: center; }
      .cover-brand { font-size: 60pt; font-weight: 900; color: #0d9488; letter-spacing: -3px; }
      .cover-line { width: 80px; height: 5px; background: #0d9488; margin: 16px auto; }
      .cover-title { font-size: 22pt; font-weight: 700; color: #1a1a1a; }
      .cover-sub { font-size: 12pt; color: #64748b; margin-top: 8px; }
      .cover-year { font-size: 14pt; color: #0d9488; font-weight: 700; margin-top: 24px; }

      /* Sections */
      .section-title { font-size: 18pt; font-weight: 700; color: #0d9488; border-bottom: 3px solid #0d9488; padding-bottom: 4mm; margin-bottom: 8mm; }
      .content-item { margin-bottom: 10mm; }
      .content-item h3 { font-size: 16pt; margin-bottom: 4mm; color: #1a1a1a; }
      .content-img { width: 100%; max-height: 100mm; object-fit: cover; border-radius: 8px; margin-bottom: 6mm; }
      .content-html { line-height: 1.6; color: #334155; }

      /* Index Table */
      .index-table { width: 100%; border-collapse: collapse; font-size: 9pt; }
      .index-table th { background: #0d9488; color: white; padding: 8px; text-align: left; }
      .index-table td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
      .index-table tr:nth-child(even) td { background: #f8fafc; }
      .index-table th.page-col, .index-table td.page-col { width: 70px; text-align: center; }

      /* Category Pages */
      .cat-section { margin-top: 5mm; }
      .product-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
      .product-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center; break-inside: avoid; }
      .product-img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 4px; background: #f8fafc; margin-bottom: 8px; }
      .product-placeholder { width: 100%; aspect-ratio: 1; background: #f1f5f9; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 8pt; margin-bottom: 8px; }
      .product-name { font-size: 9pt; font-weight: 700; color: #0f172a; margin-bottom: 2px; }
      .product-sku { font-size: 8pt; color: #0d9488; font-weight: 600; }
      .product-info { font-size: 7.5pt; color: #64748b; margin-top: 2px; }

      .footer { position: absolute; bottom: 10mm; left: 14mm; right: 14mm; font-size: 8pt; color: #94a3b8; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 3mm; }
      .page-number-box { background: #006eb3; color: white; padding: 2px 10px; border-radius: 4px; font-weight: 700; font-size: 9pt; justify-self: center; }
      
      /* TOC Styles */
      .toc-header { background: #006eb3; color: white; padding: 12px 20px; font-weight: 800; font-size: 11pt; text-transform: uppercase; display: flex; justify-content: space-between; border-radius: 4px; margin-bottom: 8mm; letter-spacing: 1px; }
      .toc-cat-row { display: flex; justify-content: space-between; align-items: baseline; margin-top: 6mm; margin-bottom: 4mm; color: #006eb3; font-weight: 800; font-size: 14pt; text-transform: uppercase; }
      .toc-cat-dots { flex: 1; border-bottom: 2px dotted #cbd5e1; margin: 0 12px; position: relative; top: -5px; }
      .toc-brand-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 3.5mm; padding-left: 6mm; color: #475569; font-size: 11pt; font-weight: 700; text-transform: uppercase; }
      .toc-brand-dots { flex: 1; border-bottom: 1.5px dotted #e2e8f0; margin: 0 10px; position: relative; top: -5px; }
      .toc-page { color: #006eb3; font-weight: 800; min-width: 60px; text-align: right; font-family: 'Courier New', monospace; font-size: 12pt; }

      /* Detail Index Styles (Teal SKU List) */
      .detail-table-teal { width: 100%; border-collapse: collapse; margin-bottom: 8mm; }
      .detail-table-teal th { background: #0d9488; color: white; padding: 10px 10px; text-align: left; font-size: 8.5pt; text-transform: uppercase; border-right: 1px solid #14b8a6; }
      .detail-table-teal td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; font-size: 8.5pt; color: #334155; vertical-align: middle; }
      .detail-table-teal .page-col { text-align: center; width: 70px; font-weight: 700; color: #0d9488; border-left: 1px solid #f1f5f9; }
      .detail-table-teal .adaptable-col { font-weight: 700; color: #0f172a; }
      .detail-table-teal tr:hover td { background: #f8fafc; }

      .detail-type-banner { background: #006eb3; color: white; padding: 10px 15px; font-weight: 800; font-size: 16pt; margin: 5mm 0 3mm 0; border-radius: 4px; text-transform: uppercase; }
      .detail-app-subtitle { color: #0d9488; font-weight: 800; font-size: 12pt; margin: 4mm 0 2mm 5px; text-transform: uppercase; border-left: 4px solid #0d9488; padding-left: 10px; }
      .detail-brand-badge { background: #1e293b; color: white; padding: 4px 12px; font-weight: 700; font-size: 10pt; display: inline-block; border-radius: 4px; margin-top: 3mm; text-transform: uppercase; }
      .detail-repeat-header th { background: #0d9488; color: white; padding: 7px 10px; text-align: left; font-size: 7.5pt; text-transform: uppercase; border-right: 1px solid #14b8a6; font-weight: 800; }
    `;

    const PRODUCTS_PER_PAGE = 12;
    const INDEX_ROWS_PER_PAGE = 30;

    const chunkArray = <T,>(arr: T[], size: number): T[][] => {
      const chunks: T[][] = [];
      for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
      }
      return chunks;
    };

    // Track dynamic pagination
    let globalPageCounter = 0;
    
    // 1. Cover
    globalPageCounter++;
    const coverPageNo = globalPageCounter;

    // 2. Content Pages
    const contentPageMappings = contentPages.map(page => {
      globalPageCounter++;
      return { ...page, pageNum: globalPageCounter };
    });

    // 4. Category Pages Mapping (Preliminary)
    const categoryMappings = cats.map(cat => {
      const productChunks = chunkArray(cat.products, PRODUCTS_PER_PAGE);
      return { ...cat, productChunks };
    });

    // 3. Table of Contents (TOC) - Preliminary structure to get page count
    const tocRowsRaw: any[] = [];
    categoryMappings.forEach(cat => {
      const brands = Array.from(new Set(cat.products.map((p: any) => (p.brandName || "Other").toUpperCase()))).sort();
      tocRowsRaw.push({ type: 'cat', name: cat.name });
      brands.forEach(b => tocRowsRaw.push({ type: 'brand', name: b }));
    });

    const indexChunksRaw = chunkArray(tocRowsRaw, 24);
    const indexPageCount = (showIndex && indexChunksRaw.length > 0) ? indexChunksRaw.length : 0;
    const indexStartPage = globalPageCounter + 1;
    globalPageCounter += indexPageCount;

    // 4. Product Detail Index Calculation
    const detailIndexRows: any[] = [];
    categoryMappings.forEach(cat => {
      detailIndexRows.push({ type: 'type', name: cat.name });
      
      const prodsInCat = cat.products || [];
      const appCats = Array.from(new Set(prodsInCat.map((p: any) => (p.applicationCategory || "General").toUpperCase()))).sort();
      
      appCats.forEach((appCat: string) => {
        detailIndexRows.push({ type: 'appCat', name: appCat });
        
        const brands = Array.from(new Set(prodsInCat.filter((p: any) => (p.applicationCategory || "General").toUpperCase() === appCat).map((p: any) => (p.brandName || "Other").toUpperCase()))).sort();
        
        brands.forEach((brand: string) => {
          detailIndexRows.push({ type: 'brand', name: brand });
          const prods = prodsInCat.filter((p: any) => (p.applicationCategory || "General").toUpperCase() === appCat && (p.brandName || "Other").toUpperCase() === brand);
          prods.forEach((p: any) => detailIndexRows.push({ type: 'product', ...p }));
        });
      });
    });

    const detailChunks = chunkArray(detailIndexRows, 15); // Further reduced for repeating headers
    const detailPageCount = (showIndex && detailChunks.length > 0) ? detailChunks.length : 0;
    const detailStartPage = globalPageCounter + 1;
    globalPageCounter += detailPageCount;

    // 5. Final Category Paging
    let currentCatPage = globalPageCounter + 1;
    const categoryPageMap = new Map<any, number>();
    const finalCategoryMappings = categoryMappings.map(cat => {
      const startPage = currentCatPage;
      categoryPageMap.set(cat.id, startPage);
      currentCatPage += cat.productChunks.length;
      return { ...cat, startPage };
    });

    // 6. Build Final TOC with Ranges
    const tocRows: any[] = [];
    finalCategoryMappings.forEach(cat => {
      const brandRanges: Record<string, { start: number; end: number }> = {};
      cat.productChunks.forEach((chunk: any[], chunkIdx: number) => {
        const pageNo = cat.startPage + chunkIdx;
        chunk.forEach(p => {
          const b = (p.brandName || "Other").toUpperCase();
          if (!brandRanges[b]) {
            brandRanges[b] = { start: pageNo, end: pageNo };
          } else {
            brandRanges[b].end = pageNo;
          }
        });
      });

      const catRange = cat.productChunks.length > 1 
        ? `${cat.startPage} - ${cat.startPage + cat.productChunks.length - 1}`
        : `${cat.startPage}`;
      
      tocRows.push({ type: 'cat', name: cat.name, range: catRange });

      Object.entries(brandRanges)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([name, range]) => {
          const brandRange = range.start === range.end ? `${range.start}` : `${range.start} - ${range.end}`;
          tocRows.push({ type: 'brand', name, range: brandRange });
        });
    });

    const indexChunks = chunkArray(tocRows, 24);

    const resolveUrl = (url?: string) => {
      if (!url) return '';
      if (url.startsWith('http') || url.startsWith('data:')) return url;
      return window.location.origin + (url.startsWith('/') ? url : '/' + url);
    };

    const mainBody = `
      <div class="sheet">
        <div class="cover">
          <div class="cover-brand">KCPL</div>
          <div class="cover-line"></div>
          <div class="cover-title">Product Catalog</div>
          <div class="cover-sub">Krishna Cooling Products Limited</div>
          <div class="cover-year">${new Date().getFullYear()}</div>
        </div>
        <div class="footer">
          <span>KCPL © ${new Date().getFullYear()}</span>
          <span class="page-number-box">${coverPageNo}</span>
          <span style="text-align: right;">Catalog Cover</span>
        </div>
      </div>

      ${showContent && contentPageMappings.length > 0 ? contentPageMappings.map(page => {
        if (page.type === 'custom') {
          return `
          <div class="sheet page-break">
            ${customPageContents[page.id] || ''}
            <div class="footer">
              <span>KCPL Catalog</span>
              <span class="page-number-box">${page.pageNum}</span>
              <span style="text-align: right;">${page.title}</span>
            </div>
          </div>
          `;
        }
        return `
          <div class="sheet page-break">
            <h2 class="section-title">${page.title}</h2>
            <div class="content-item">
              ${page.imageUrl ? `<img src="${resolveUrl(page.imageUrl)}" class="content-img">` : ''}
              <div class="content-html">${page.content || ''}</div>
            </div>
            <div class="footer">
              <span>KCPL Catalog</span>
              <span class="page-number-box">${page.pageNum}</span>
              <span style="text-align: right;">${page.title}</span>
            </div>
          </div>
        `;
      }).join('') : ''}

      ${showIndex && indexChunks.length > 0 ? indexChunks.map((chunk: any[], idx: number) => `
        <div class="sheet page-break">
          <div class="toc-header">
            <span>Brand</span>
            <span>Page No.</span>
          </div>
          
          <div class="toc-body">
            ${chunk.map(row => {
              if (row.type === 'cat') {
                return `
                  <div class="toc-cat-row">
                    <span>${row.name}</span>
                    <div class="toc-cat-dots"></div>
                    <span class="toc-page">${row.range}</span>
                  </div>
                `;
              }
              return `
                <div class="toc-brand-row">
                  <span>${row.name}</span>
                  <div class="toc-brand-dots"></div>
                  <span class="toc-page">${row.range}</span>
                </div>
              `;
            }).join('')}
          </div>

          <div class="footer">
            <span>KCPL Catalog</span>
            <span class="page-number-box">${indexStartPage + idx}</span>
            <span style="text-align: right;">Table of Contents</span>
          </div>
        </div>
      `).join('') : ''}

      ${showIndex && detailChunks.length > 0 ? detailChunks.map((chunk: any[], idx: number) => `
        <div class="sheet page-break">
          <h2 class="section-title">Detail Product Index</h2>
          
          <table class="detail-table-teal">
            <tbody>
              ${chunk.map(row => {
                if (row.type === 'type') {
                  return `<tr><td colspan="4" style="border: none; padding: 0;"><div class="detail-type-banner">${row.name}</div></td></tr>`;
                }
                if (row.type === 'appCat') {
                  return `<tr><td colspan="4" style="border: none; padding: 0;"><div class="detail-app-subtitle">${row.name}</div></td></tr>`;
                }
                if (row.type === 'brand') {
                  return `
                    <tr><td colspan="4" style="border: none; padding: 10px 0 0 0;"><div class="detail-brand-badge">${row.name}</div></td></tr>
                    <tr class="detail-repeat-header">
                      <th>Model / Size</th>
                      <th>KCPL Code</th>
                      <th>Adaptable Part</th>
                      <th class="page-col" style="border-right:none;">P.No</th>
                    </tr>
                  `;
                }
                const p = row;
                return `
                  <tr>
                    <td>${p.modelName || ''} ${p.size ? `• ${p.size}` : ''}</td>
                    <td style="font-family: monospace;">${p.kcplCode || ''}</td>
                    <td class="adaptable-col">${p.adaptablePartNo || ''}</td>
                    <td class="page-col">${categoryPageMap.get(p.categoryId) ?? categoryPageMap.get(p.productType) ?? categoryPageMap.get(String(p.categoryId)) ?? '—'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="footer">
            <span>KCPL Catalog</span>
            <span class="page-number-box">${detailStartPage + idx}</span>
            <span style="text-align: right;">Product Detail Index</span>
          </div>
        </div>
      `).join('') : ''}

      ${finalCategoryMappings.map((cat: any) => cat.productChunks.map((chunk: any[], chunkIdx: number) => `
        <div class="sheet page-break">
          <h2 class="section-title">${cat.name} ${cat.productChunks.length > 1 ? `<span style="font-size: 10pt; color: #64748b; font-weight: normal; margin-left:10px;">(Part ${chunkIdx + 1})</span>` : ''}</h2>
          <div class="product-grid">
            ${chunk.map((p: any) => `
              <div class="product-card">
                ${p.imageUrl ? `<img src="${resolveUrl(p.imageUrl)}" class="product-img">` : `<div class="product-placeholder">No Image</div>`}
                <div class="product-name">${p.modelName || 'Product'}</div>
                <div class="product-sku">${p.kcplCode || 'CODE-000'}</div>
                <div class="product-info">${p.brandName || ''} • ${p.size || 'No Size'}</div>
              </div>
            `).join('')}
          </div>
          <div class="footer">
            <span>KCPL Catalog</span>
            <span class="page-number-box">${cat.startPage + chunkIdx}</span>
            <span style="text-align: right;">${cat.name}</span>
          </div>
        </div>
      `).join('')).join('')}
    `;

    if (bodyOnly) {
      return `
        <style>${styles}</style>
        <div class="catalog-content-root" style="background: white;">
          ${mainBody}
        </div>
      `;
    }

    const html = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>${styles}</style>
    </head>
    <body style="margin: 0; padding: 0;">
      ${mainBody}
      ${includeScript ? '<script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 1000); }</script>' : ''}
    </body>
    </html>`;

    return html;
  };

  const handlePrint = async () => {
    if (!previewData) return;
    
    // 1. Trigger the browser print (opens in new tab with print dialog)
    const html = buildPrintHTML(previewData, { includeScript: true });
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    
    if (!win) {
      toast({ title: "Popup blocked", description: "Please allow popups to print.", variant: "destructive" });
    } else {
      setStep(3);
      setIsDone(true);
    }

    // 2. Direct PDF Download (Improved Page-by-Page Rendering)
    try {
      setIsGenerating(true);
      toast({ 
        title: "Generating PDF...", 
        description: "Rendering pages individually for best quality. This may take a moment.",
      });

      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const tempContainer = document.createElement('div');
      tempContainer.style.width = '210mm';
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '-10000px';
      tempContainer.style.top = '0';
      tempContainer.style.zIndex = '-9999';
      tempContainer.innerHTML = buildPrintHTML(previewData, { bodyOnly: true });
      document.body.appendChild(tempContainer);

      await document.fonts.ready;
      // Wait for images to load
      const images = tempContainer.getElementsByTagName('img');
      await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }));
      
      // Delay to ensure layout is settled
      await new Promise(resolve => setTimeout(resolve, 1000));

      const sheets = tempContainer.querySelectorAll('.sheet');
      
      for (let i = 0; i < sheets.length; i++) {
        const sheet = sheets[i] as HTMLElement;
        const canvas = await html2canvas(sheet, {
          scale: 1.5, // High quality scale
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#ffffff',
          logging: false,
          width: sheet.offsetWidth,
          height: sheet.offsetHeight
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.9);
        
        if (i > 0) doc.addPage();
        doc.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      }

      doc.save(`KCPL_Catalog_${new Date().toISOString().split('T')[0]}.pdf`);

      try {
        await exportCatalog({
          format: "pdf",
          sections: previewData.sections ?? [],
        });
      } catch (err: any) {
        console.warn("Export activity log failed", err);
      }

      document.body.removeChild(tempContainer);
      setIsGenerating(false);
      toast({ title: "Download complete!" });
    } catch (err: any) {
      console.error("PDF Generate Error:", err);
      setIsGenerating(false);
      toast({ title: "Export Failed", description: "The catalog was too large for your browser to process.", variant: "destructive" });
    }
  };

  if (showLivePreview && previewData) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col">
        <div className="bg-white/90 backdrop-blur-xl border-b border-border px-50 py-10 flex items-center justify-evenly shadow-sm sticky h-20 top-0 ">
          <div className="flex items-center gap-5">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowLivePreview(false)} 
              className="rounded-full hover:bg-slate-100 h-11 w-11 transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
            <div>
              <h2 className="text-2xl font-display font-bold text-slate-900 tracking-tight leading-none">Catalog Preview</h2>
              <p className="text-sm text-muted-foreground mt-1.5 font-medium">Review exactly how your catalog will look when printed</p>
            </div>
          </div>
          <div className="flex gap-5 items-center">
            <Button 
              variant="outline" 
              onClick={() => setShowLivePreview(false)} 
              className="h-11 px-12 py-12 font-semibold border-slate-200 hover:bg-slate-100 transition-all rounded-xl active:scale-95 w-40"
            >
              Edit Selection
            </Button>
            <Button 
              onClick={handlePrint} 
              disabled={isGenerating}
              className="h-11 px-12 py-12 font-semibold shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-95 transition-all rounded-xl gap-2 bg-primary text-primary-foreground w-40"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />} 
              {isGenerating ? "Preparing..." : "Print Full Catalog"}
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-12 flex justify-center bg-slate-200/40 relative pattern-dots">
          <div className="max-w-4xl w-full bg-transparent shadow-2xl shadow-slate-400/30 rounded-sm overflow-visible transform-gpu" dangerouslySetInnerHTML={{ __html: buildPrintHTML(previewData, { forBrowser: true, bodyOnly: true }) }} />
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="mb-8 max-w-5xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground flex items-center gap-3">
          <Download className="w-8 h-8 text-primary" />
          Export Engine
        </h1>
        <p className="text-muted-foreground mt-1">Compile and generate full product catalogs for print or digital distribution.</p>

        {/* Stepper */}
        <div className="flex items-center justify-between mt-8 relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-border/50 -z-10" />
          {[1, 2, 3].map((num) => (
            <div key={num} className={`flex flex-col items-center gap-2 bg-background px-4 ${step === num ? 'opacity-100' : 'opacity-50'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors ${
                step > num ? 'bg-primary border-primary text-primary-foreground' :
                step === num ? 'border-primary text-primary bg-primary/10' :
                'border-border text-muted-foreground bg-muted'
              }`}>
                {step > num ? <CheckCircle2 className="w-5 h-5" /> : num}
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider hidden sm:block">
                {num === 1 ? 'Selection' : num === 2 ? 'Preview' : 'Generate'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto">
        {step === 1 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Card className="border-border/50 shadow-sm rounded-xl overflow-hidden">
              <div className="bg-muted/20 px-6 py-4 border-b border-border/50 flex justify-between items-center">
                <h3 className="font-semibold text-lg flex items-center gap-2"><Settings2 className="w-5 h-5 text-primary" /> Configuration</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAllTypes} className="h-8 text-xs">Select All Categories</Button>
                  <Button variant="outline" size="sm" onClick={clearTypes} className="h-8 text-xs">Clear Categories</Button>
                </div>
              </div>
              <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-border/50">
                  <div className="p-6 space-y-4">
                    <h4 className="text-sm font-semibold uppercase text-muted-foreground">Content Pages</h4>
                    <div className="space-y-2">
                      {contentPresetOptions.map((option) => (
                        <label
                          key={option.key}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            activeContentPreset === option.key
                              ? "bg-primary/5 border-primary/30 ring-1 ring-primary/30"
                              : "bg-transparent border-border/50 hover:border-primary/50"
                          }`}
                        >
                          <Checkbox
                            checked={activeContentPreset === option.key}
                            onCheckedChange={() => applyContentPreset(option.key, option.pageIds)}
                          />
                          <span className="font-medium text-sm">{option.label}</span>
                        </label>
                      ))}
                    </div>

                    <details className="group rounded-xl border border-border/50 bg-card">
                      <summary className="list-none cursor-pointer p-4 flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">Content Page Checklist</div>
                          <div className="text-xs text-muted-foreground">
                            {selectedContentPageIds.length} selected of {visibleContentPages.length}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      <div className="border-t border-border/50 p-3 space-y-2 max-h-72 overflow-auto">
                        {visibleContentPages.length === 0 ? (
                          <p className="text-xs text-muted-foreground px-2 py-1">
                            No content pages available for this category context.
                          </p>
                        ) : (
                          visibleContentPages.map((page) => (
                            <label
                              key={page.id}
                              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                selectedContentPageIds.includes(page.id)
                                  ? "bg-primary/5 border-primary/30"
                                  : "bg-transparent border-border/40 hover:border-primary/40"
                              }`}
                            >
                              <Checkbox
                                checked={selectedContentPageIds.includes(page.id)}
                                onCheckedChange={() => toggleContentPage(page.id)}
                                className="mt-0.5"
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{page.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  Category: {(page.category || "all").toUpperCase()} • Order: {page.sortOrder}
                                </p>
                              </div>
                            </label>
                          ))
                        )}
                      </div>
                    </details>

                    <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${includeIndexPages ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/30' : 'bg-transparent border-border/50 hover:border-primary/50'}`}>
                      <Checkbox checked={includeIndexPages} onCheckedChange={() => setIncludeIndexPages((prev) => !prev)} className="mt-1" />
                      <div>
                        <div className="font-medium">Include Index Pages</div>
                        <div className="text-xs text-muted-foreground">Include formatted index section</div>
                      </div>
                    </label>
                  </div>
                  <div className="p-6 space-y-4">
                    <h4 className="text-sm font-semibold uppercase text-muted-foreground">
                      Categories ({isFromAllProducts ? "all preselected" : "source category preselected"})
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                      {masterProductTypes?.map(type => (
                        <label key={type.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedTypeNames.includes(type.name) ? 'bg-primary/5 border-primary/30' : 'bg-transparent border-border/50 hover:border-primary/50'}`}>
                          <Checkbox checked={selectedTypeNames.includes(type.name)} onCheckedChange={() => toggleType(type.name)} />
                          <span className="font-medium text-sm">{type.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-end">
              <Button size="lg" className="shadow-xl" onClick={goToPreview} disabled={previewMutation.isPending}>
                {previewMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Generate Preview <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

        {step === 2 && previewData && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <Card className="border-border/50 shadow-md">
              <CardContent className="p-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                    <div className="text-2xl font-bold text-primary">{previewData.categories?.reduce((t, c) => t + c.products.length, 0)}</div>
                    <div className="text-xs text-muted-foreground uppercase font-semibold">Total Products</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                    <div className="text-2xl font-bold text-primary">{previewData.categories?.length}</div>
                    <div className="text-xs text-muted-foreground uppercase font-semibold">Categories</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                    <div className="text-2xl font-bold text-primary">{previewData.contentPages?.length}</div>
                    <div className="text-xs text-muted-foreground uppercase font-semibold">Content Pages</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                    <div className="text-2xl font-bold text-primary">{totalSheets}</div>
                    <div className="text-xs text-muted-foreground uppercase font-semibold">Total Sheets</div>
                  </div>
                </div>

                <div className="bg-primary/5 rounded-2xl p-8 text-center border border-primary/10">
                  <Eye className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Live Catalog Preview Ready</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-6 text-sm">
                    We have compiled the catalog based on your selection. Preview the actual layout before printing.
                  </p>
                  <Button size="lg" variant="outline" className="bg-white hover:bg-slate-50" onClick={() => setShowLivePreview(true)}>
                    <Eye className="w-4 h-4 mr-2" /> View Full Preview
                  </Button>
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}><ChevronLeft className="w-4 h-4 mr-2" /> Back</Button>
              <Button size="lg" onClick={handlePrint} className="min-w-[200px] shadow-lg shadow-primary/20">
                <Printer className="w-4 h-4 mr-2" /> Print Catalog
              </Button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center py-12 text-center">
            <div className="w-20 h-20 bg-green-500/10 text-green-600 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-bold mb-2">Printing Successfully Initiated</h2>
            <p className="text-muted-foreground max-w-md mb-8">
              A new tab has been opened with the print dialog. Please ensure you select <strong>"Save as PDF"</strong> to download.
            </p>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setStep(1)}>Create Another</Button>
              <Button onClick={() => setShowLivePreview(true)}>Review Again</Button>
            </div>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
