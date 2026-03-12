import { useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useListUsers, useCreateUser, useUpdateUser, useDeleteUser, useListRoles } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Users as UsersIcon, Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Users() {
  const { data: users, isLoading } = useListUsers();
  const { data: roles } = useListRoles();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({ username: "", email: "", password: "", roleId: "" });

  const resetForm = () => {
    setFormData({ username: "", email: "", password: "", roleId: "" });
    setIsEdit(false);
    setEditingId(null);
  };

  const handleEdit = (user: any) => {
    setFormData({
      username: user.username,
      email: user.email,
      password: "",
      roleId: user.roleId.toString()
    });
    setIsEdit(true);
    setEditingId(user.id);
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEdit && editingId) {
      const payload: any = { username: formData.username, email: formData.email, roleId: parseInt(formData.roleId) };
      if (formData.password) payload.password = formData.password;
      
      updateMutation.mutate({ id: editingId, data: payload }, {
        onSuccess: () => {
          toast({ title: "User updated successfully" });
          setOpen(false);
          resetForm();
          queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        },
        onError: (err: any) => toast({ title: "Update failed", description: err.message, variant: "destructive" })
      });
    } else {
      createMutation.mutate({ data: { ...formData, roleId: parseInt(formData.roleId) } }, {
        onSuccess: () => {
          toast({ title: "User created successfully" });
          setOpen(false);
          resetForm();
          queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        },
        onError: (err: any) => toast({ title: "Creation failed", description: err.message, variant: "destructive" })
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this user?")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "User deleted" });
          queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        },
        onError: (err: any) => toast({ title: "Delete failed", description: err.message, variant: "destructive" })
      });
    }
  };

  const getRoleBadgeColor = (roleName: string) => {
    switch (roleName?.toLowerCase()) {
      case 'admin': return "bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20";
      case 'manager': return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20";
      case 'editor': return "bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20";
      default: return "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20 border-gray-500/20";
    }
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground flex items-center gap-3">
            <UsersIcon className="w-8 h-8 text-primary" />
            Users
          </h1>
          <p className="text-muted-foreground mt-1">Manage system access and team members.</p>
        </div>
        
        <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="hover-elevate shadow-lg shadow-primary/20 shrink-0">
              <Plus className="w-4 h-4 mr-2" />
              New User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{isEdit ? "Edit User" : "Create New User"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{isEdit ? "Password (leave blank to keep current)" : "Password"}</Label>
                <Input id="password" type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required={!isEdit} />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={formData.roleId} onValueChange={(val) => setFormData({...formData, roleId: val})} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles?.map(role => (
                      <SelectItem key={role.id} value={role.id.toString()}>{role.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="w-full">
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isEdit ? "Save Changes" : "Create User"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : users?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users?.map((user) => (
                <TableRow key={user.id} className="group">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold uppercase border border-primary/20">
                        {user.username.substring(0, 2)}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{user.username}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`font-medium ${getRoleBadgeColor(user.role?.name)}`}>
                      {user.role?.name || 'No Role'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Active</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(user.createdAt), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(user)} className="h-8 w-8 text-muted-foreground hover:text-primary">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(user.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
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
    </Layout>
  );
}