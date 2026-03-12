import { useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useListRoles, useCreateRole, useUpdateRole, useDeleteRole } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Shield, Plus, Edit, Trash2, Loader2, Users } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const AVAILABLE_PERMISSIONS = [
  { id: "products:write", label: "Create & Edit Products" },
  { id: "products:delete", label: "Delete Products" },
  { id: "categories:write", label: "Manage Categories" },
  { id: "content:write", label: "Edit Content Pages" },
  { id: "export", label: "Export Catalogs" },
  { id: "users:write", label: "Manage Users" },
  { id: "roles:write", label: "Manage Roles" }
];

export default function Roles() {
  const { data: roles, isLoading } = useListRoles();
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();
  const deleteMutation = useDeleteRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({ 
    name: "", 
    description: "", 
    permissions: [] as string[] 
  });

  const resetForm = () => {
    setFormData({ name: "", description: "", permissions: [] });
    setIsEdit(false);
    setEditingId(null);
  };

  const handleEdit = (role: any) => {
    setFormData({
      name: role.name,
      description: role.description || "",
      permissions: Array.isArray(role.permissions) ? role.permissions : []
    });
    setIsEdit(true);
    setEditingId(role.id);
    setOpen(true);
  };

  const togglePermission = (permId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permId)
        ? prev.permissions.filter(p => p !== permId)
        : [...prev.permissions, permId]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEdit && editingId) {
      updateMutation.mutate({ id: editingId, data: formData }, {
        onSuccess: () => {
          toast({ title: "Role updated successfully" });
          setOpen(false);
          resetForm();
          queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
        },
        onError: (err: any) => toast({ title: "Update failed", description: err.message, variant: "destructive" })
      });
    } else {
      createMutation.mutate({ data: formData }, {
        onSuccess: () => {
          toast({ title: "Role created successfully" });
          setOpen(false);
          resetForm();
          queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
        },
        onError: (err: any) => toast({ title: "Creation failed", description: err.message, variant: "destructive" })
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this role? Users with this role will lose their permissions.")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Role deleted" });
          queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
        },
        onError: (err: any) => toast({ title: "Delete failed", description: err.message, variant: "destructive" })
      });
    }
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            Roles & Permissions
          </h1>
          <p className="text-muted-foreground mt-1">Define access levels and capabilities for team members.</p>
        </div>
        
        <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="hover-elevate shadow-lg shadow-primary/20 shrink-0">
              <Plus className="w-4 h-4 mr-2" />
              New Role
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{isEdit ? "Edit Role" : "Create New Role"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Role Name</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required placeholder="e.g. Content Editor" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="What can this role do?" />
              </div>
              
              <div className="space-y-3 pt-2">
                <Label>Permissions</Label>
                <div className="grid grid-cols-1 gap-3 p-4 border border-border/50 rounded-xl bg-muted/20">
                  {AVAILABLE_PERMISSIONS.map(perm => (
                    <div key={perm.id} className="flex items-center space-x-3">
                      <Checkbox 
                        id={`perm-${perm.id}`} 
                        checked={formData.permissions.includes(perm.id)}
                        onCheckedChange={() => togglePermission(perm.id)}
                      />
                      <Label htmlFor={`perm-${perm.id}`} className="font-normal cursor-pointer">{perm.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="w-full">
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isEdit ? "Save Changes" : "Create Role"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles?.map((role) => (
            <Card key={role.id} className="border-border/50 hover:shadow-md transition-shadow">
              <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl font-display">{role.name}</CardTitle>
                    <CardDescription className="mt-1 line-clamp-2">{role.description || 'No description provided.'}</CardDescription>
                  </div>
                  <div className="flex gap-1 -mr-2 -mt-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(role)} className="h-8 w-8 text-muted-foreground hover:text-primary">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(role.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 pb-4">
                <div className="mb-4">
                  <div className="text-sm font-medium text-muted-foreground mb-2">Permissions</div>
                  <div className="flex flex-wrap gap-2">
                    {(Array.isArray(role.permissions) ? role.permissions : []).map((perm: string) => (
                      <Badge key={perm} variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 text-xs">
                        {AVAILABLE_PERMISSIONS.find(p => p.id === perm)?.label || perm}
                      </Badge>
                    ))}
                    {(!role.permissions || role.permissions.length === 0) && (
                      <span className="text-sm text-muted-foreground italic">No permissions</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground pt-4 border-t border-border/50">
                  <Users className="w-4 h-4" />
                  <span>Assigned to multiple users</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  );
}