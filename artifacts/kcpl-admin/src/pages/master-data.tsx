import { useState, useMemo, useEffect } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  useCreateAppCat, 
  useGetProductTypesMaster, 
  useCreateProductType 
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Settings2, Plus, Loader2, Search, Tag, ShieldCheck, Factory, Filter } from "lucide-react";

export default function MasterData() {
  const { toast } = useToast();
  
  // States for new entries
  const [newBrand, setNewBrand] = useState("");
  const [newAppCat, setNewAppCat] = useState("");
  const [newType, setNewType] = useState("");

  // States for selected parents in "Add" forms
  const [selectedTypeForCat, setSelectedTypeForCat] = useState<string>("");
  const [selectedTypeForBrand, setSelectedTypeForBrand] = useState<string>("");
  const [selectedCatForBrand, setSelectedCatForBrand] = useState<string>("");

  // States for filters in tables
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [catFilter, setCatFilter] = useState<string>("all");

  const { data: brands, isLoading: loadingBrands, refetch: refetchBrands } = useGetBrands();
  const { data: appCats, isLoading: loadingAppCats, refetch: refetchAppCats } = useGetAppCats();
  const { data: types, isLoading: loadingTypes, refetch: refetchTypes } = useGetProductTypesMaster();

  const createBrand = useCreateBrand();
  const createAppCat = useCreateAppCat();
  const createType = useCreateProductType();

  // Reset dependent selection when parent changes
  useEffect(() => {
    setSelectedCatForBrand("");
  }, [selectedTypeForBrand]);

  const handleAddType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newType) return;
    createType.mutate({ data: { name: newType } }, {
      onSuccess: () => {
        toast({ title: "Product type added" });
        setNewType("");
        refetchTypes();
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  const handleAddAppCat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppCat || !selectedTypeForCat) {
      toast({ title: "Validation Error", description: "Select a Product Type first", variant: "destructive" });
      return;
    }
    createAppCat.mutate({ data: { name: newAppCat, productTypeId: Number(selectedTypeForCat) } }, {
      onSuccess: () => {
        toast({ title: "Application category added" });
        setNewAppCat("");
        refetchAppCats();
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

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
        refetchBrands();
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  const filteredAppCatsForBrandForm = useMemo(() => {
    if (!selectedTypeForBrand) return [];
    return appCats?.filter(c => c.productTypeId === Number(selectedTypeForBrand)) || [];
  }, [appCats, selectedTypeForBrand]);

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground flex items-center gap-3">
          <Settings2 className="w-8 h-8 text-primary" />
          Master Data Hierarchy
        </h1>
        <p className="text-muted-foreground mt-1">Manage dependent brands, application categories, and product types.</p>
      </div>

      <Tabs defaultValue="types" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-8 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="types" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Tag className="w-4 h-4 mr-2" />
            1. Product Types
          </TabsTrigger>
          <TabsTrigger value="app-cats" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <ShieldCheck className="w-4 h-4 mr-2" />
            2. Applications
          </TabsTrigger>
          <TabsTrigger value="brands" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Factory className="w-4 h-4 mr-2" />
            3. Brands
          </TabsTrigger>
        </TabsList>

        <TabsContent value="types">
          <MasterTable 
            title="Step 1: Product Types"
            description="Manage technical root product types (e.g. Copper, Aluminum)."
            items={types || []}
            isLoading={loadingTypes}
            onAdd={handleAddType}
            inputValue={newType}
            setInputValue={setNewType}
            isPending={createType.isPending}
            placeholder="e.g. Radiator, Condenser"
          />
        </TabsContent>

        <TabsContent value="app-cats">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <Card className="border-border/50 sticky top-24">
                <CardHeader>
                  <CardTitle className="text-xl">Add Application Category</CardTitle>
                  <CardDescription>Link a new category to a product type.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Root Product Type</label>
                    <Select value={selectedTypeForCat} onValueChange={setSelectedTypeForCat}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select Product Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {types?.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <form onSubmit={handleAddAppCat} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Category Name</label>
                      <Input 
                        placeholder="e.g. Heavy Duty, Passenger"
                        value={newAppCat}
                        onChange={(e) => setNewAppCat(e.target.value)}
                        className="h-11"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full h-11" disabled={createAppCat.isPending || !selectedTypeForCat}>
                      {createAppCat.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                      Add Category
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-2">
              <ListFull 
                title="Application Categories"
                items={appCats || []}
                isLoading={loadingAppCats}
                parents={types || []}
                filterValue={typeFilter}
                onFilterChange={setTypeFilter}
                filterLabel="Filter by Type"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="brands">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <Card className="border-border/50 sticky top-24">
                <CardHeader>
                  <CardTitle className="text-xl">Add Brand</CardTitle>
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
                        placeholder="e.g. Toyota, Tata"
                        value={newBrand}
                        onChange={(e) => setNewBrand(e.target.value)}
                        className="h-11"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full h-11" disabled={createBrand.isPending || !selectedCatForBrand}>
                      {createBrand.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                      Add Brand
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-2 space-y-4">
              <div className="flex gap-4">
                 <div className="flex-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Type Filter</label>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="h-10 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {types?.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                 </div>
                 <div className="flex-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Category Filter</label>
                    <Select value={catFilter} onValueChange={setCatFilter}>
                      <SelectTrigger className="h-10 bg-background">
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
              <BrandsList 
                brands={brands || []}
                isLoading={loadingBrands}
                types={types || []}
                cats={appCats || []}
                typeFilter={typeFilter}
                catFilter={catFilter}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Layout>
  );
}

function MasterTable({ title, description, items, isLoading, onAdd, inputValue, setInputValue, isPending, placeholder }: any) {
  const [search, setSearch] = useState("");
  const filtered = items.filter((i: any) => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <Card className="border-border/50 sticky top-24">
          <CardHeader>
            <CardTitle className="text-xl">Add New</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onAdd} className="space-y-4">
              <Input 
                placeholder={placeholder}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="h-11"
                required
              />
              <Button type="submit" className="w-full h-11" disabled={isPending}>
                {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Save
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-2">
        <ListSimple title={title} items={filtered} isLoading={isLoading} search={search} onSearch={setSearch} />
      </div>
    </div>
  );
}

function ListSimple({ title, items, isLoading, search, onSearch }: any) {
  return (
    <Card className="border-border/50 shadow-sm overflow-hidden">
      <CardHeader className="bg-muted/20 border-b border-border/50 flex flex-row items-center justify-between">
        <CardTitle className="text-xl">{title}</CardTitle>
        <div className="relative w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input placeholder="Search..." className="pl-9 h-9 bg-background" value={search} onChange={(e) => onSearch(e.target.value)} />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">No.</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <LoadingRow /> : items.length === 0 ? <EmptyRow /> : items.map((item: any, index: number) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ListFull({ title, items, isLoading, parents, filterValue, onFilterChange, filterLabel }: any) {
  const [search, setSearch] = useState("");
  const filtered = items.filter((i: any) => {
    const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterValue === "all" || i.productTypeId === Number(filterValue);
    return matchesSearch && matchesFilter;
  });

  return (
    <Card className="border-border/50 shadow-sm overflow-hidden">
      <CardHeader className="bg-muted/20 border-b border-border/50 space-y-4">
        <div className="flex items-center justify-between">
            <CardTitle className="text-xl">{title}</CardTitle>
            <div className="relative w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input placeholder="Search..." className="pl-9 h-9 bg-background" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
        </div>
        <div className="flex items-center gap-2">
            <Filter className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{filterLabel}:</span>
            <Select value={filterValue} onValueChange={onFilterChange}>
                <SelectTrigger className="h-8 w-40 text-xs bg-background">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {parents.map((p: any) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">No.</TableHead>
              <TableHead>Category Name</TableHead>
              <TableHead>Product Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <LoadingRow colSpan={3} /> : filtered.length === 0 ? <EmptyRow colSpan={3} /> : filtered.map((item: any, index: number) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                <TableCell>
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-bold">
                        {parents.find((p: any) => p.id === item.productTypeId)?.name}
                    </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function BrandsList({ brands, isLoading, types, cats, typeFilter, catFilter }: any) {
    const [search, setSearch] = useState("");
    const filtered = brands.filter((i: any) => {
        const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase());
        const matchesType = typeFilter === "all" || i.productTypeId === Number(typeFilter);
        const matchesCat = catFilter === "all" || i.applicationCategoryId === Number(catFilter);
        return matchesSearch && matchesType && matchesCat;
    });

    return (
        <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/20 border-b border-border/50 flex flex-row items-center justify-between">
                <CardTitle className="text-xl">Vehicle Brands</CardTitle>
                <div className="relative w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input placeholder="Search..." className="pl-9 h-9 bg-background" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">No.</TableHead>
                            <TableHead>Brand Name</TableHead>
                            <TableHead>Hierarchy (Type &gt; Category)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? <LoadingRow colSpan={3} /> : filtered.length === 0 ? <EmptyRow colSpan={3} /> : filtered.map((item: any, index: number) => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                                <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold">
                                        <span className="text-primary">{types.find((t: any) => t.id === item.productTypeId)?.name}</span>
                                        <span className="text-muted-foreground">/</span>
                                        <span className="text-muted-foreground">{cats.find((c: any) => c.id === item.applicationCategoryId)?.name}</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

function LoadingRow({ colSpan = 3 }: any) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-center py-12 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
        Loading...
      </TableCell>
    </TableRow>
  );
}

function EmptyRow({ colSpan = 3 }: any) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-center py-12 text-muted-foreground">
        No entries found.
      </TableCell>
    </TableRow>
  );
}
