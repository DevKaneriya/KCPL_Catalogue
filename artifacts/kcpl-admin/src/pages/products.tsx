import { useState } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useListProducts, useListCategories, useDeleteProduct } from "@workspace/api-client-react";
import { useDebounce } from "@/hooks/use-debounce";
import { PackageSearch, Plus, Search, Edit, Trash2, ImageOff, Loader2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function Products() {
  const [, params] = useRoute("/products/:categorySlug");
  const slug = params?.categorySlug;
  const [, setLocation] = useLocation();
  
  const { data: categories } = useListCategories();
  const currentCategory = slug && slug !== 'all' ? categories?.find(c => c.slug === slug) : null;
  const categoryId = currentCategory?.id;

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useListProducts({ 
    categoryId: categoryId, 
    search: debouncedSearch || undefined,
    page,
    limit
  });
  
  const deleteMutation = useDeleteProduct();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const handleDownloadCatalog = () => {
    // Navigate to export page with this category selected
    // Note: Export page will need to read state or query param. For now, simple navigation.
    setLocation(`/export?category=${categoryId || 'all'}`);
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground flex items-center gap-3 capitalize">
            <PackageSearch className="w-8 h-8 text-primary" />
            {slug === 'all' ? 'All Products' : currentCategory?.name || 'Products'}
          </h1>
          <p className="text-muted-foreground mt-1">Manage SKUs, details, and specifications.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 shrink-0">
          <Button variant="outline" className="shadow-sm hover:bg-muted/50" onClick={handleDownloadCatalog}>
            <Download className="w-4 h-4 mr-2" />
            Download {currentCategory ? currentCategory.name : 'All'} Catalog
          </Button>
          <Button asChild className="hover-elevate shadow-lg shadow-primary/20">
            <Link href={slug && slug !== 'all' ? `/products/${slug}/new` : "/products/all/new"}>
              <Plus className="w-4 h-4 mr-2" />
              Add New Product
            </Link>
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/20">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input 
              placeholder="Search by SKU, KCPL code, or brand..." 
              className="pl-9 bg-background h-10 border-border/60"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1); // Reset page on search
              }}
            />
          </div>
          <div className="text-sm text-muted-foreground font-medium tabular-nums px-3 py-1.5 bg-background rounded-md border border-border/50 shadow-sm">
            {data?.total || 0} Products Found
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[100px] py-4">Image</TableHead>
                <TableHead className="py-4">Details</TableHead>
                <TableHead className="py-4">Brands</TableHead>
                <TableHead className="py-4">Type/Size</TableHead>
                <TableHead className="py-4">Category</TableHead>
                <TableHead className="text-right py-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                    Loading products...
                  </TableCell>
                </TableRow>
              ) : data?.products?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <PackageSearch className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-lg font-medium text-foreground">No products found</p>
                    <p className="text-sm text-muted-foreground">Try adjusting your search or add a new product.</p>
                  </TableCell>
                </TableRow>
              ) : (
                data?.products?.map((product) => (
                  <TableRow key={product.id} className="group hover:bg-muted/20 transition-colors">
                    <TableCell className="py-3">
                      <div className="w-20 h-20 rounded-lg border border-border/60 bg-background flex items-center justify-center overflow-hidden shadow-sm">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain p-1" />
                        ) : (
                          <ImageOff className="w-6 h-6 text-muted-foreground opacity-30" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="font-medium text-base mb-1">{product.name || 'Unnamed Product'}</div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-mono bg-muted/50 px-1.5 py-0.5 rounded text-xs border border-border/40 text-foreground">{product.kcplCode || '-'}</span>
                        <span>SKU: {product.skuCode || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium">{product.vehicleBrand || '-'}</span>
                        {product.engineBrand && <span className="text-xs text-muted-foreground">{product.engineBrand}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm capitalize">{product.productType || '-'}</span>
                        {product.size && <span className="text-xs text-muted-foreground">{product.size}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge variant="secondary" className="bg-primary/5 text-primary hover:bg-primary/10 border-primary/20">
                        {categories?.find(c => c.id === product.categoryId)?.name || 'Uncategorized'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right py-3">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="outline" size="icon" asChild className="h-9 w-9 bg-background hover:text-primary hover:border-primary/50 shadow-sm">
                          <Link href={`/products/${slug || 'all'}/${product.id}/edit`}>
                            <Edit className="w-4 h-4" />
                          </Link>
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-9 w-9 bg-background hover:text-destructive hover:border-destructive/50 shadow-sm"
                          onClick={() => handleDelete(product.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {data && data.totalPages > 1 && (
          <div className="p-4 border-t border-border/50 flex justify-between items-center bg-muted/10">
            <Button 
              variant="outline" 
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="text-sm font-medium text-muted-foreground">Page <span className="text-foreground">{page}</span> of {data.totalPages}</span>
            <Button 
              variant="outline" 
              size="sm"
              disabled={page === data.totalPages}
              onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
