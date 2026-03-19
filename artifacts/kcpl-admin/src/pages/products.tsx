import { useState, useEffect } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  useListProducts, 
  useListCategories, 
  useDeleteProduct, 
  useGetProductFilters,
  useGetProductTypesMaster
} from "@workspace/api-client-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";
import { PackageSearch, Plus, Search, Edit, Trash2, ImageOff, Loader2, Download, Table2, FilterX, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import * as XLSX from "xlsx";

const normalizeImageSrc = (src?: string | null) => {
  if (!src) return "";
  const trimmed = src.trim();
  if (!trimmed) return "";
  if (
    trimmed.startsWith("data:") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }
  const isBase64 = /^[A-Za-z0-9+/=]+$/.test(trimmed) && trimmed.length > 200;
  return isBase64 ? `data:image/jpeg;base64,${trimmed}` : trimmed;
};

function ProductImage({ src, alt }: { src?: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  const normalized = normalizeImageSrc(src);

  if (!normalized || failed) {
    return <ImageOff className="w-6 h-6 text-muted-foreground opacity-40" />;
  }

  return (
    <img
      src={normalized}
      alt={alt}
      className="w-full h-full object-contain"
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
}

export default function Products() {
  const [, params] = useRoute("/products/:categorySlug");
  const slug = params?.categorySlug;
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  
  const { data: masterProductTypes } = useGetProductTypesMaster();
  const currentMasterType = slug && slug !== 'all' ? masterProductTypes?.find(t => t.name === decodeURIComponent(slug)) : null;

  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [appCategory, setAppCategory] = useState(searchParams.get("appCategory") || "all");
  const [brand, setBrand] = useState(searchParams.get("brand") || "all");
  const [productType, setProductType] = useState(searchParams.get("productType") || "all");
  
  const debouncedSearch = useDebounce(searchTerm, 500);
  
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const limit = 7; 

  const { data: filters } = useGetProductFilters({
    categoryId: undefined, 
    // Fetch all available filter options independently
    applicationCategory: undefined,
    productType: undefined
  });

  useEffect(() => {
    if (slug && slug !== 'all' && masterProductTypes) {
      const type = masterProductTypes.find(t => t.name === decodeURIComponent(slug));
      if (type) {
        setProductType(type.name);
      }
    } else if (slug === 'all') {
      setProductType(searchParams.get("productType") || "all");
    }
  }, [slug, masterProductTypes]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (appCategory !== "all") params.set("appCategory", appCategory);
    if (brand !== "all") params.set("brand", brand);
    if (productType !== "all" && slug === 'all') params.set("productType", productType);
    if (page > 1) params.set("page", page.toString());
    
    const newSearch = params.toString();
    const currentPath = window.location.pathname;
    window.history.replaceState(null, "", `${currentPath}${newSearch ? '?' + newSearch : ''}`);
  }, [debouncedSearch, appCategory, brand, productType, page, slug]);

  useEffect(() => {
    setPage(1);
    setAppCategory("all");
    setBrand("all");
  }, [slug]);

  const { data, isLoading } = useListProducts({ 
    categoryId: undefined, 
    search: debouncedSearch || undefined,
    applicationCategory: appCategory === "all" ? undefined : appCategory,
    brandName: brand === "all" ? undefined : brand,
    productType: currentMasterType ? currentMasterType.name : (productType === "all" ? undefined : productType),
    page,
    limit
  } as any);
  
  const deleteMutation = useDeleteProduct();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { checkPermission } = useAuth();
  
  const canWrite = checkPermission("products:write");
  const canDelete = checkPermission("products:delete");

  const handleDelete = (id: number) => {
    if (confirm("Delete this product? This action cannot be undone.")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Product deleted" });
          queryClient.invalidateQueries({ queryKey: ["/api/products"] });
        },
        onError: (err: any) => {
          toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
        }
      });
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setAppCategory("all");
    setBrand("all");
    if (slug === 'all') {
      setProductType("all");
    }
    setPage(1);
  };

  const handleDownloadCatalog = () => {
    const params = new URLSearchParams();
    params.set("category", slug || "all");
    if (appCategory !== "all") params.set("appCategory", appCategory);
    if (brand !== "all") params.set("brand", brand);
    
    // Prioritize the tab's type, then the dropdown's type
    const activeType = currentMasterType ? currentMasterType.name : (productType !== "all" ? productType : undefined);
    if (activeType) params.set("productType", activeType);
    
    setLocation(`/export?${params.toString()}`);
  };

  const exportExcel = async () => {
    try {
      if (!data?.products || data.products.length === 0) {
        toast({ title: "No data to export", variant: "destructive" });
        return;
      }
      
      const exportData = data.products.map(p => ({
        "Application Category": p.applicationCategory || "",
        "Product Type": p.productType || "",
        "Brand Name": p.brandName || "",
        "KCPL Code": p.kcplCode || "",
        "Model Name": p.modelName || "",
        "Size": p.size || "",
        "Adaptable Part No": p.adaptablePartNo || "",
        "Category": p.categoryName || ""
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
      
      // Use writeFile from XLSX
      XLSX.writeFile(workbook, `KCPL_Products_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast({ title: "Excel exported successfully!" });
    } catch (err: any) {
      console.error("Excel Export Error:", err);
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    }
  };



  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground flex items-center gap-3 capitalize">
            <PackageSearch className="w-8 h-8 text-primary" />
            {slug === 'all' ? 'All Products' : currentMasterType?.name || 'Products'}
          </h1>
          <p className="text-muted-foreground mt-1">Manage SKUs, details, and specifications.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 shrink-0">
          <Button variant="outline" className="shadow-sm hover:bg-muted/50" onClick={exportExcel}>
            <Table2 className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
          <Button variant="outline" className="shadow-sm hover:bg-muted/50" onClick={handleDownloadCatalog}>
            <Download className="w-4 h-4 mr-2" />
            Export Catalog
          </Button>
          {canWrite && (
            <Button asChild className="hover-elevate shadow-lg shadow-primary/20">
              <Link href={slug && slug !== 'all' ? `/products/${slug}/new` : "/products/all/new"}>
                <Plus className="w-4 h-4 mr-2" />
                Add New Product
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm mb-4">
        <div className="p-4 border-b border-border/50 flex flex-col gap-4 bg-muted/20">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative w-full lg:w-1/4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input 
                placeholder="Search code, brand, model..." 
                className="pl-9 bg-background h-10 border-border/60"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            
            <div className="flex flex-wrap gap-3 items-center flex-1">
              {slug === 'all' && (
                <div className="w-full sm:w-[180px]">
                  <Select 
                    value={productType} 
                    onValueChange={(val) => {
                      setProductType(val);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="bg-background h-10 border-border/60">
                      <SelectValue placeholder="Product Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {masterProductTypes?.map(t => (
                        <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="w-full sm:w-[180px]">
                <Select 
                  value={appCategory} 
                  onValueChange={(val) => {
                    setAppCategory(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="bg-background h-10 border-border/60">
                    <SelectValue placeholder="Application" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Applications</SelectItem>
                    {filters?.applicationCategories?.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:w-[180px]">
                <Select 
                  value={brand} 
                  onValueChange={(val) => {
                    setBrand(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="bg-background h-10 border-border/60">
                    <SelectValue placeholder="Brand Name" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Brands</SelectItem>
                    {filters?.brands?.map(b => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(searchTerm || appCategory !== 'all' || brand !== 'all' || productType !== 'all') && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-foreground">
                  <FilterX className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>

            <div className="text-sm text-muted-foreground font-medium tabular-nums px-3 py-2 bg-background rounded-md border border-border/50 shadow-sm ml-auto">
              {(data as any)?.total || 0} Found
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[120px] py-4">Image</TableHead>
                <TableHead className="py-4">KCPL Code</TableHead>
                <TableHead className="py-4">Model Name</TableHead>
                <TableHead className="py-4">Brand Name</TableHead>
                <TableHead className="py-4">Application Category</TableHead>
                <TableHead className="py-4">Product Type</TableHead>
                <TableHead className="py-4">Size</TableHead>
                <TableHead className="py-4">Adaptable Part No</TableHead>
                <TableHead className="text-right py-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                    Loading products...
                  </TableCell>
                </TableRow>
              ) : (data as any)?.products?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center">
                    <PackageSearch className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-lg font-medium text-foreground">No products found</p>
                    <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
                  </TableCell>
                </TableRow>
              ) : (
                (data as any)?.products?.map((product: any) => {
                  const imageSrc = normalizeImageSrc(product.imageUrl);
                  return (
                  <TableRow key={product.id} className="group hover:bg-muted/20 transition-colors">
                    <TableCell className="py-3">
                      <div
                        className="w-24 h-16 rounded-lg flex items-center justify-center p-1 bg-white border border-border/50"
                        onClick={() => imageSrc && window.open(imageSrc, "_blank")}
                        title={imageSrc ? "Open full image" : "No image"}
                        style={{ cursor: imageSrc ? 'zoom-in' : 'default' }}
                      >
                        <ProductImage src={imageSrc} alt={product.kcplCode || "Product image"} />
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="font-mono font-semibold text-primary">{product.kcplCode || '-'}</span>
                    </TableCell>
                    <TableCell className="py-3">
                       <div className="font-medium">{product.modelName || '-'}</div>
                    </TableCell>
                    <TableCell className="py-3">
                       <span className="text-sm">{product.brandName || '-'}</span>
                    </TableCell>
                    <TableCell className="py-3">
                       <span className="text-sm">{product.applicationCategory || '-'}</span>
                    </TableCell>
                    <TableCell className="py-3">
                       <span className="text-sm">{product.productType || '-'}</span>
                    </TableCell>
                    <TableCell className="py-3">
                       <span className="text-sm">{product.size || '-'}</span>
                    </TableCell>
                    <TableCell className="py-3 font-mono text-xs">
                       {product.adaptablePartNo || '-'}
                    </TableCell>
                    <TableCell className="text-right py-3">
                      <div className="flex justify-end gap-2">
                        {canWrite && (
                          <Button variant="outline" size="icon" asChild className="h-9 w-9 bg-background hover:text-primary hover:border-primary/50 shadow-sm">
                            <Link href={`/products/${slug || 'all'}/${product.id}/edit`}>
                              <Edit className="w-4 h-4" />
                            </Link>
                          </Button>
                        )}
                        {canDelete && (
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-9 w-9 bg-background hover:text-destructive hover:border-destructive/50 shadow-sm"
                            onClick={() => handleDelete(product.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
                })
              )}
            </TableBody>
          </Table>
        </div>
        
        {data && (data as any).total > 0 && (
          <div className="p-4 border-t border-border/50 bg-muted/10 flex items-center justify-center sm:justify-end">
            <div className="inline-flex items-center gap-3">
              <span className="text-base font-medium tabular-nums">
                {Math.min((page - 1) * limit + 1, (data as any).total)} - {Math.min(page * limit, (data as any).total)} of {(data as any).total}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground disabled:text-muted-foreground/40"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground disabled:text-muted-foreground/40"
                  disabled={page === (data as any).totalPages}
                  onClick={() => setPage((p) => Math.min((data as any).totalPages, p + 1))}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
