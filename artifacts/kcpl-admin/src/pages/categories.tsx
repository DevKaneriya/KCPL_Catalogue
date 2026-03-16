import { useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useListCategories, useCreateCategory, useDeleteCategory } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Plus, Tags, Trash2, Loader2, FolderTree, X, ListPlus, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/auth-context";

type FieldDefinition = {
  name: string;
  type: string;
  options?: string[];
};

export default function Categories() {
  const { data: categories, isLoading } = useListCategories();
  const createMutation = useCreateCategory();
  const deleteMutation = useDeleteCategory();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { checkPermission } = useAuth();
  
  const canManage = checkPermission("categories:write");

  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "", slug: "" });
  const [fields, setFields] = useState<FieldDefinition[]>([]);

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData({ ...formData, name, slug: generateSlug(name) });
  };

  const addField = () => {
    setFields([...fields, { name: "", type: "text" }]);
  };

  const updateField = (index: number, updates: Partial<FieldDefinition>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFields(newFields);
  };

  const removeField = (index: number) => {
    const newFields = [...fields];
    newFields.splice(index, 1);
    setFields(newFields);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const fieldSchema = fields.reduce((acc, field) => {
      if (field.name) {
        acc[field.name] = { type: field.type, options: field.options };
      }
      return acc;
    }, {} as Record<string, any>);

    createMutation.mutate(
      { data: { ...formData, fieldSchema } },
      {
        onSuccess: () => {
          toast({ title: "Category created successfully" });
          setOpen(false);
          setFormData({ name: "", description: "", slug: "" });
          setFields([]);
          queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
        },
        onError: (err: any) => {
          toast({ title: "Failed to create category", description: err.message, variant: "destructive" });
        }
      }
    );
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this category? All associated products may be affected.")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Category deleted" });
          queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
        },
        onError: (err: any) => {
          toast({ title: "Delete failed", description: err.message, variant: "destructive" });
        }
      });
    }
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground flex items-center gap-3">
            <Tags className="w-8 h-8 text-primary" />
            Categories
          </h1>
          <p className="text-muted-foreground mt-1">Manage product categories and metadata schemas.</p>
        </div>
        
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="hover-elevate shadow-lg shadow-primary/20 shrink-0">
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
              <DialogHeader className="p-6 pb-2">
                <DialogTitle className="text-2xl font-display">Create New Category</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                <ScrollArea className="flex-1 px-6 pb-4">
                  <div className="space-y-6">
                    {/* Basic Details */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" value={formData.name} onChange={handleNameChange} required placeholder="e.g. Intercoolers" className="h-11" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="slug">Slug</Label>
                        <Input id="slug" value={formData.slug} onChange={(e) => setFormData({...formData, slug: e.target.value})} required className="bg-muted/50 font-mono text-sm h-11" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Optional description..." className="min-h-24" />
                      </div>
                    </div>

                    {/* Schema Builder */}
                    <div className="pt-6 border-t border-border/50">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <Label className="text-base font-semibold">SKU Form Fields (Schema)</Label>
                          <p className="text-xs text-muted-foreground mt-0.5">Define custom fields for products in this category.</p>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={addField} className="h-8">
                          <ListPlus className="w-4 h-4 mr-2" />
                          Add Field
                        </Button>
                      </div>

                      <div className="space-y-3">
                        {fields.map((field, index) => (
                          <div key={index} className="flex gap-2 items-start p-3 bg-muted/20 border border-border/50 rounded-lg relative group">
                            <div className="flex-1 space-y-3">
                              <div className="flex gap-2">
                                <div className="flex-1">
                                  <Label className="text-xs mb-1 block">Field Label</Label>
                                  <Input 
                                    value={field.name} 
                                    onChange={(e) => updateField(index, { name: e.target.value })} 
                                    placeholder="e.g. Core Material" 
                                    className="h-9"
                                    required
                                  />
                                </div>
                                <div className="w-[140px]">
                                  <Label className="text-xs mb-1 block">Type</Label>
                                  <Select value={field.type} onValueChange={(val) => updateField(index, { type: val })}>
                                    <SelectTrigger className="h-9 bg-background">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="text">Text</SelectItem>
                                      <SelectItem value="number">Number</SelectItem>
                                      <SelectItem value="dropdown">Dropdown</SelectItem>
                                      <SelectItem value="textarea">Textarea</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              
                              {field.type === 'dropdown' && (
                                <div>
                                  <Label className="text-xs mb-1 block">Options (comma separated)</Label>
                                  <Input 
                                    value={field.options?.join(', ') || ''} 
                                    onChange={(e) => updateField(index, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} 
                                    placeholder="e.g. Aluminum, Copper, Brass" 
                                    className="h-9"
                                    required
                                  />
                                </div>
                              )}
                            </div>
                            
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => removeField(index)}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0 mt-6"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        {fields.length === 0 && (
                          <div className="text-center py-6 bg-muted/10 border border-dashed border-border rounded-lg text-muted-foreground text-sm">
                            No custom fields defined. Products will only have standard fields.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
                
                <div className="p-6 pt-4 border-t border-border bg-background flex justify-end gap-3 mt-auto">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending} className="min-w-32 shadow-lg shadow-primary/20">
                    {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Create Category
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
                <TableHead className="py-4 pl-6">Category Name</TableHead>
                <TableHead className="py-4">Slug</TableHead>
                <TableHead className="py-4">Custom Fields</TableHead>
                <TableHead className="py-4">Products</TableHead>
                <TableHead className="py-4">Created</TableHead>
                <TableHead className="text-right py-4 pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : categories?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <FolderTree className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-lg font-medium text-foreground">No categories found</p>
                    <p className="text-sm text-muted-foreground">Create one to get started.</p>
                  </TableCell>
                </TableRow>
              ) : (
                categories?.map((cat) => {
                  const schemaKeys = cat.fieldSchema ? Object.keys(cat.fieldSchema) : [];
                  
                  return (
                    <TableRow key={cat.id} className="group hover:bg-muted/20 transition-colors">
                      <TableCell className="font-medium pl-6 py-4">
                        <div className="text-base">{cat.name}</div>
                        {cat.description && <div className="text-sm text-muted-foreground font-normal mt-0.5 line-clamp-1 max-w-[250px]">{cat.description}</div>}
                      </TableCell>
                      <TableCell className="py-4">
                        <code className="px-2 py-1 bg-muted/50 border border-border/40 rounded text-xs text-foreground font-medium">{cat.slug}</code>
                      </TableCell>
                      <TableCell className="py-4">
                        {schemaKeys.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {schemaKeys.slice(0, 2).map(key => (
                              <Badge key={key} variant="outline" className="text-[10px] py-0 h-5 bg-background">{key}</Badge>
                            ))}
                            {schemaKeys.length > 2 && (
                              <Badge variant="outline" className="text-[10px] py-0 h-5 bg-background">+{schemaKeys.length - 2} more</Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">None</span>
                        )}
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge className="font-display font-bold text-sm bg-primary/10 text-primary hover:bg-primary/20 border-0">{cat.productCount || 0}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground tabular-nums py-4">
                        {format(new Date(cat.createdAt), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right py-4 pr-6">
                        {canManage && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDelete(cat.id)}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all h-9 w-9"
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Layout>
  );
}
