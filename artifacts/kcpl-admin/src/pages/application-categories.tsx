import { useState } from "react";
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
  useGetAppCats, 
  useCreateAppCat, 
  useGetProductTypesMaster 
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, Search, LayoutDashboard, Filter, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";

export default function ApplicationCategories() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { checkPermission } = useAuth();
  const canManage = checkPermission("products:write");
  
  const [newAppCat, setNewAppCat] = useState("");
  const [selectedTypeForCat, setSelectedTypeForCat] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: appCats, isLoading: loadingAppCats } = useGetAppCats();
  const { data: types } = useGetProductTypesMaster();
  const createAppCat = useCreateAppCat();

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
        queryClient.invalidateQueries({ queryKey: ["/api/masters/application-categories"] });
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this application category?")) {
      try {
        const response = await fetch(`/api/masters/application-categories/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          toast({ title: "Deleted successfully" });
          queryClient.invalidateQueries({ queryKey: ["/api/masters/application-categories"] });
        } else {
          const err = await response.json();
          throw new Error(err.message || 'Delete failed');
        }
      } catch (err: any) {
        toast({ title: "Delete failed", description: err.message, variant: "destructive" });
      }
    }
  };

  const filtered = appCats?.filter((i: any) => {
    const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = typeFilter === "all" || i.productTypeId === Number(typeFilter);
    return matchesSearch && matchesFilter;
  }) || [];

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground flex items-center gap-3">
          <LayoutDashboard className="w-8 h-8 text-primary" />
          Application Categories
        </h1>
        <p className="text-muted-foreground mt-1">Manage categories linked to technical product types.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Column */}
        {canManage && (
          <div className="lg:col-span-1">
            <Card className="border-border/50 sticky top-24 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">Add New Category</CardTitle>
                <CardDescription>Create a specific application for a product type.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Linked Product Type</label>
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
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Application Name</label>
                    <Input 
                      placeholder="e.g. Passenger Cars, Trucks"
                      value={newAppCat}
                      onChange={(e) => setNewAppCat(e.target.value)}
                      className="h-11"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full h-11 shadow-lg shadow-primary/10" disabled={createAppCat.isPending || !selectedTypeForCat}>
                    {createAppCat.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    Save Category
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
                  <CardTitle className="text-xl">Existing Categories</CardTitle>
                  <div className="relative w-48">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input placeholder="Search..." className="pl-9 h-9 bg-background" value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
              </div>
              <div className="flex items-center gap-2">
                  <Filter className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Filter by Product Type:</span>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="h-8 w-44 text-xs bg-background">
                          <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          {types?.map((p: any) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
                      </SelectContent>
                  </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-[80px] pl-6">ID</TableHead>
                    <TableHead>Category Name</TableHead>
                    <TableHead>Product Type</TableHead>
                    <TableHead className="text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingAppCats ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                        No entries found.
                      </TableCell>
                    </TableRow>
                  ) : filtered.map((item: any) => (
                    <TableRow key={item.id} className="group hover:bg-muted/10 transition-colors">
                      <TableCell className="font-mono text-xs text-muted-foreground pl-6">#{item.id}</TableCell>
                      <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                      <TableCell>
                          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-bold">
                              {types?.find((p: any) => p.id === item.productTypeId)?.name || 'Unknown'}
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
