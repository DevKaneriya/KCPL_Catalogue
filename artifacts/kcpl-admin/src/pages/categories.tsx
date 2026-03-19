import { useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useGetProductTypesMaster, useCreateProductType } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Plus, Tags, Trash2, Loader2, Save } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/auth-context";

export default function ProductTypes() {
  const { data: productTypes, isLoading } = useGetProductTypesMaster();
  const createMutation = useCreateProductType();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { checkPermission, token } = useAuth();
  
  const canManage = checkPermission("products:write");

  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    createMutation.mutate(
      { data: { name: formData.name } },
      {
        onSuccess: () => {
          toast({ title: "Product Type created" });
          setOpen(false);
          setFormData({ name: "" });
          queryClient.invalidateQueries({ queryKey: ["/api/masters/product-types"] });
        },
        onError: (err: any) => {
          toast({ title: "Failed to create type", description: err.message, variant: "destructive" });
        }
      }
    );
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this product type? This may affect products and filters.")) {
      try {
        if (!token) throw new Error("You are not logged in");
        const response = await fetch(`/api/masters/product-types/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          toast({ title: "Product Type deleted" });
          queryClient.invalidateQueries({ queryKey: ["/api/masters/product-types"] });
        } else {
          const err = await response.json().catch(() => null);
          throw new Error(err?.message || err?.error || 'Delete failed');
        }
      } catch (err: any) {
        toast({ title: "Delete failed", description: err.message, variant: "destructive" });
      }
    }
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground flex items-center gap-3">
            <Tags className="w-8 h-8 text-primary" />
            Product Types
          </h1>
          <p className="text-muted-foreground mt-1">Manage technical root types for the catalog.</p>
        </div>
        
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="hover-elevate shadow-lg shadow-primary/20 shrink-0">
                <Plus className="w-4 h-4 mr-2" />
                Add Product Type
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
              <DialogHeader className="p-6 pb-2">
                <DialogTitle className="text-2xl font-display">Create New Product Type</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="flex flex-col flex-1">
                <div className="px-6 pb-6 space-y-4 shadow-inner pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Type Name</Label>
                    <Input 
                      id="name" 
                      value={formData.name} 
                      onChange={(e) => setFormData({ name: e.target.value })} 
                      required 
                      placeholder="e.g. Radiators" 
                      className="h-11" 
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This will appear in the main catalog navigation.
                  </p>
                </div>
                
                <div className="p-6 border-t border-border bg-background flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending} className="min-w-32 shadow-lg shadow-primary/20">
                    {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Type
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="border-border/50 shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent">
                <TableHead className="py-4 pl-6 w-[100px]">No.</TableHead>
                <TableHead className="py-4">Type Name</TableHead>
                <TableHead className="py-4">Created</TableHead>
                <TableHead className="text-right py-4 pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : productTypes?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-48 text-center">
                    <Tags className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-lg font-medium text-foreground">No Product Types found</p>
                    <p className="text-sm text-muted-foreground">Create one to get started.</p>
                  </TableCell>
                </TableRow>
              ) : (
                productTypes?.map((type, index) => (
                  <TableRow key={type.id} className="group hover:bg-muted/20 transition-colors">
                    <TableCell className="pl-6 py-4 font-medium text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium py-4">
                      <div className="text-base">{type.name}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums py-4">
                      {format(new Date(type.createdAt || new Date()), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right py-4 pr-6">
                      {canManage && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(type.id)}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all h-9 w-9"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Layout>
  );
}
