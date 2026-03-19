import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useGetCatalogPreviewData, useGetProductTypesMaster, useListContentPages } from "@workspace/api-client-react";

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
                    contents[page.id] = htmlText;
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

  const buildPrintHTML = (data: CatalogPreviewData, forBrowser: boolean = false): string => {
    const cats = data.categories || [];
    const contentPages = data.contentPages || [];
    const indexData = data.index || [];
    const showContent = contentPages.length > 0;
    const showIndex = includeIndexPages && indexData.length > 0;
    const contentCount = showContent ? contentPages.length : 0;
    const indexCount = showIndex && indexData.length > 0 ? 1 : 0;
    const categoryStartPage = 1 + contentCount + indexCount + 1;
    const categoryPageMap = new Map<number, number>(
      cats.map((cat: any, idx: number) => [cat.id, categoryStartPage + idx])
    );

    const styles = `
      @page { size: A4; margin: 18mm 14mm; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
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
      }
      .page-break { page-break-after: always; }
      
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

      .footer { position: absolute; bottom: 10mm; left: 14mm; right: 14mm; font-size: 8pt; color: #94a3b8; display: flex; justify-content: space-between; border-top: 1px solid #f1f5f9; padding-top: 3mm; }
    `;

    const resolveUrl = (url?: string) => {
      if (!url) return '';
      if (url.startsWith('http') || url.startsWith('data:')) return url;
      return window.location.origin + (url.startsWith('/') ? url : '/' + url);
    };

    const html = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>${styles}</style>
    </head>
    <body>
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
          <span>Catalog Cover</span>
        </div>
      </div>

      ${showContent && contentPages.length > 0 ? contentPages.map(page => {
        if (page.type === 'custom') {
          return `
          <div class="sheet page-break">
            ${customPageContents[page.id] || ''}
            <div class="footer">
              <span>KCPL Catalog</span>
              <span>${page.title}</span>
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
              <span>${page.title}</span>
            </div>
          </div>
        `;
      }).join('') : ''}

      ${showIndex && indexData.length > 0 ? `
        <div class="sheet page-break">
          <h2 class="section-title">Product Index</h2>
          <table class="index-table">
            <thead>
              <tr>
                <th>Brand</th>
                <th>Model / Size</th>
                <th>KCPL Code</th>
                <th>Adaptable Part</th>
                <th class="page-col">Page No</th>
              </tr>
            </thead>
            <tbody>
              ${indexData.flatMap((brand: any) => brand.sizes.flatMap((size: any) => size.products.map((p: any) => `
                <tr>
                  <td>${brand.brand}</td>
                  <td>${size.size}</td>
                  <td>${p.kcplCode || '—'}</td>
                  <td><strong>${p.adaptablePartNo || '—'}</strong></td>
                  <td class="page-col">${categoryPageMap.get(p.categoryId) ?? '—'}</td>
                </tr>
              `))).join('')}
            </tbody>
          </table>
          <div class="footer">
            <span>KCPL Catalog</span>
            <span>Index</span>
          </div>
        </div>
      ` : ''}

      ${cats.map(cat => `
        <div class="sheet page-break">
          <h2 class="section-title">${cat.name}</h2>
          <div class="product-grid">
            ${cat.products.map((p: any) => `
              <div class="product-card">
                ${p.imageUrl ? `<img src="${resolveUrl(p.imageUrl)}" class="product-img">` : `<div class="product-placeholder">No Image</div>`}
                <div class="product-name">${p.modelName || 'Product'}</div>
                <div class="product-sku">${p.kcplCode || 'CODE-000'}</div>
                <div class="product-info">${p.brandName || ''} ${p.size ? `• ${p.size}` : ''}</div>
              </div>
            `).join('')}
          </div>
          <div class="footer">
            <span>KCPL Catalog</span>
            <span>${cat.name}</span>
          </div>
        </div>
      `).join('')}

      ${!forBrowser ? '<script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 1000); }</script>' : ''}
    </body>
    </html>`;

    return html;
  };

  const handlePrint = async () => {
    if (!previewData) return;
    
    // 1. Trigger the browser print (opens in new tab with print dialog)
    const html = buildPrintHTML(previewData, false);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    
    if (!win) {
      toast({ title: "Popup blocked", description: "Please allow popups to print.", variant: "destructive" });
    } else {
      setStep(3);
      setIsDone(true);
    }

    // 2. Direct PDF Download
    try {
      setIsGenerating(true);
      toast({ 
        title: "Generating PDF...", 
        description: "Your catalog is being prepared for download.",
      });

      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      // Simple HTML to PDF conversion using the available container or building one
      const tempContainer = document.createElement('div');
      tempContainer.style.width = '210mm';
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.innerHTML = buildPrintHTML(previewData, true);
      document.body.appendChild(tempContainer);

      await doc.html(tempContainer, {
        callback: function (doc) {
          doc.save(`KCPL_Catalog_${new Date().toISOString().split('T')[0]}.pdf`);
          document.body.removeChild(tempContainer);
          setIsGenerating(false);
          toast({ title: "Download complete!" });
        },
        x: 0,
        y: 0,
        width: 210,
        windowWidth: 800,
        html2canvas: {
          scale: 0.25, // Lower scale for better performance and smaller size
          useCORS: true,
          allowTaint: true,
          logging: false,
          letterRendering: true
        }
      });
    } catch (err: any) {
      console.error("PDF Generate Error:", err);
      setIsGenerating(false);
      // We don't block the user since the print window likely still opened
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
          <div className="max-w-4xl w-full bg-transparent shadow-2xl shadow-slate-400/30 rounded-sm overflow-visible transform-gpu" dangerouslySetInnerHTML={{ __html: buildPrintHTML(previewData, true) }} />
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
                    <div className="text-2xl font-bold text-primary">{(previewData.categories?.length || 0) + (includeIndexPages ? 1 : 0) + ((previewData.contentPages?.length || 0) > 0 ? 1 : 0) + 1}</div>
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

