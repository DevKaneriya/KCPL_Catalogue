import { useState, useMemo, useEffect } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  useGetBrands, 
  useCreateBrand, 
  useGetAppCats, 
  useGetProductTypesMaster 
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, Search, Settings2, Filter, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";

export default function Brands() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { checkPermission } = useAuth();
  const canManage = checkPermission("products:write");
  
  const [newBrand, setNewBrand] = useState("");
  const [selectedTypeForBrand, setSelectedTypeForBrand] = useState<string>("");
  const [selectedCatForBrand, setSelectedCatForBrand] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: brands, isLoading: loadingBrands } = useGetBrands();
  const { data: appCats } = useGetAppCats();
  const { data: types } = useGetProductTypesMaster();
  const createBrand = useCreateBrand();

  // Reset dependent selection when parent changes
  useEffect(() => {
    setSelectedCatForBrand("");
  }, [selectedTypeForBrand]);

  const handleAddBrand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrand || !selectedTypeForBrand || !selectedCatForBrand) {
      toast({ title: "Validation Error", description: "Select Type and Category first", variant: "destructive" });
      return;
    }
    createBrand.mutate({ 
      data: { 
        name: newBrand, 
        productTypeId: Number(selectedTypeForBrand), 
        applicationCategoryId: Number(selectedCatForBrand) 
      } 
    }, {
      onSuccess: () => {
        toast({ title: "Brand added" });
        setNewBrand("");
        queryClient.invalidateQueries({ queryKey: ["/api/masters/brands"] });
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this brand?")) {
      try {
        const response = await fetch(`/api/masters/brands/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          toast({ title: "Brand deleted" });
          queryClient.invalidateQueries({ queryKey: ["/api/masters/brands"] });
        } else {
          const err = await response.json();
          throw new Error(err.message || 'Delete failed');
        }
      } catch (err: any) {
        toast({ title: "Delete failed", description: err.message, variant: "destructive" });
      }
    }
  };

  const filteredAppCatsForBrandForm = useMemo(() => {
    if (!selectedTypeForBrand) return [];
    return appCats?.filter(c => c.productTypeId === Number(selectedTypeForBrand)) || [];
  }, [appCats, selectedTypeForBrand]);

  const filteredBrands = brands?.filter((i: any) => {
    const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || i.productTypeId === Number(typeFilter);
    const matchesCat = catFilter === "all" || i.applicationCategoryId === Number(catFilter);
    return matchesSearch && matchesType && matchesCat;
  }) || [];

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground flex items-center gap-3">
          <Settings2 className="w-8 h-8 text-primary" />
          Vehicle Brands
        </h1>
        <p className="text-muted-foreground mt-1">Manage brands organized by product type and application.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Column */}
        {canManage && (
          <div className="lg:col-span-1">
            <Card className="border-border/50 sticky top-24 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">Add New Brand</CardTitle>
                <CardDescription>Link brand to Type and Category.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">1. Product Type</label>
                  <Select value={selectedTypeForBrand} onValueChange={setSelectedTypeForBrand}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {types?.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">2. Application Category</label>
                  <Select 
                    value={selectedCatForBrand} 
                    onValueChange={setSelectedCatForBrand}
                    disabled={!selectedTypeForBrand}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder={selectedTypeForBrand ? "Select Category" : "Select Type First"} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredAppCatsForBrandForm.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <form onSubmit={handleAddBrand} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">3. Brand Name</label>
                    <Input 
                      placeholder="e.g. Toyota, Tata, Honda"
                      value={newBrand}
                      onChange={(e) => setNewBrand(e.target.value)}
                      className="h-11"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full h-11 shadow-lg shadow-primary/10" disabled={createBrand.isPending || !selectedCatForBrand}>
                    {createBrand.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    Save Brand
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* List Column */}
        <div className={canManage ? "lg:col-span-2 space-y-4" : "lg:col-span-3 space-y-4"}>
           <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/20 border-b border-border/50 space-y-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Registered Brands</CardTitle>
                <div className="relative w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input placeholder="Search..." className="pl-9 h-9 bg-background" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                 <div className="flex items-center gap-2">
                    <Filter className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Type:</span>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="h-8 w-32 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {types?.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                 </div>
                 <div className="flex items-center gap-2">
                    <Filter className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Category:</span>
                    <Select value={catFilter} onValueChange={setCatFilter}>
                      <SelectTrigger className="h-8 w-40 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {(typeFilter === 'all' ? appCats : appCats?.filter(c => c.productTypeId === Number(typeFilter)))?.map(c => (
                          <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                 </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-[80px] pl-6">ID</TableHead>
                    <TableHead>Brand Name</TableHead>
                    <TableHead>Application Category</TableHead>
                    <TableHead>Product Type</TableHead>
                    <TableHead className="text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingBrands ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredBrands.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        No entries found.
                      </TableCell>
                    </TableRow>
                  ) : filteredBrands.map((item: any) => (
                    <TableRow key={item.id} className="group hover:bg-muted/10 transition-colors">
                      <TableCell className="font-mono text-xs text-muted-foreground pl-6">#{item.id}</TableCell>
                      <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-xs font-semibold uppercase">
                          {appCats?.find((c: any) => c.id === item.applicationCategoryId)?.name || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-bold uppercase">
                          {types?.find((t: any) => t.id === item.productTypeId)?.name || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        {canManage && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDelete(item.id)}
                            className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all h-8 w-8"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
