import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useListContentPages, useDeleteContentPage } from "@workspace/api-client-react";
import { FileText, Plus, Edit, Trash2, GripVertical, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useAuth } from "@/contexts/auth-context";

export default function ContentPages() {
  const { data: pages, isLoading, error } = useListContentPages();
  const deleteMutation = useDeleteContentPage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { checkPermission } = useAuth();
  
  const canWrite = checkPermission("content:write");
  const safePages = Array.isArray(pages) ? [...pages].sort((a, b) => a.sortOrder - b.sortOrder) : [];


  const handleDelete = (id: number) => {
    if (confirm("Delete this page? It will be removed from the catalog immediately.")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Page deleted" });
          queryClient.invalidateQueries({ queryKey: ["/api/content-pages"] });
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
            <FileText className="w-8 h-8 text-primary" />
            Content Pages
          </h1>
          <p className="text-muted-foreground mt-1">Manage static pages like Preface, Vision, and Introduction.</p>
        </div>
        
        {canWrite && (
          <Button asChild className="hover-elevate shadow-lg shadow-primary/20 shrink-0">
            <Link href="/content/new">
              <Plus className="w-4 h-4 mr-2" />
              Add Content Page
            </Link>
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" /></div>
        ) : error ? (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-destructive font-medium">Failed to load content pages.</p>
              <p className="text-xs text-muted-foreground mt-2">{(error as any)?.message || "Please try again."}</p>
            </CardContent>
          </Card>
        ) : safePages.length === 0 ? (
          <Card className="border-border/50 border-dashed">
            <CardContent className="p-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium text-foreground">No content pages yet</p>
              <p className="text-muted-foreground">Create pages to include them in the generated catalogs.</p>
            </CardContent>
          </Card>
        ) : (
          safePages.map((page) => (
            <Card key={page.id} className="border-border/50 group transition-all duration-200 hover:border-primary/30">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="cursor-move text-muted-foreground opacity-30 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="w-5 h-5" />
                </div>
                
                {page.imageUrl ? (
                  <img src={page.imageUrl} alt={page.title} className="w-16 h-16 rounded object-cover border border-border" />
                ) : (
                  <div className="w-16 h-16 rounded bg-muted border border-border flex items-center justify-center">
                    <FileText className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                )}
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg">{page.title}</h3>
                    {page.type === "custom" ? (
                      <Badge variant="secondary" className="text-[10px] h-5">Custom</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] h-5 bg-primary/5">Editor</Badge>
                    )}
                    {page.category && page.category !== "all" && (
                      <Badge variant="outline" className="text-[10px] h-5 capitalize">{page.category}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span>Order: {page.sortOrder}</span>
                    <span>•</span>
                    <span>Updated {format(new Date(page.updatedAt), 'MMM d, yyyy')}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {canWrite && (
                    <>
                      <Button variant="outline" size="sm" asChild className="hover-elevate">
                        <Link href={`/content/${page.id}/edit`}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Link>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(page.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </Layout>
  );
}
