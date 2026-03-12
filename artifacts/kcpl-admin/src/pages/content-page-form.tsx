import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGetContentPage, useCreateContentPage, useUpdateContentPage } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Loader2, Bold, Italic, Underline, List, ListOrdered, Heading2 } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useQueryClient } from "@tanstack/react-query";

function RichTextEditor({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
  }, [value]);

  if (!editor) return null;

  return (
    <div className="border border-border rounded-md overflow-hidden">
      <div className="flex flex-wrap gap-1 p-2 border-b border-border bg-muted/30">
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleBold().run()} data-active={editor.isActive("bold")}>
          <Bold className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleItalic().run()} data-active={editor.isActive("italic")}>
          <Italic className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Underline className="w-4 h-4" />
        </Button>
        <div className="w-px h-8 bg-border mx-1" />
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="w-4 h-4" />
        </Button>
        <div className="w-px h-8 bg-border mx-1" />
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="w-4 h-4" />
        </Button>
      </div>
      <EditorContent editor={editor} className="prose prose-sm max-w-none p-4 min-h-[200px] focus-within:outline-none bg-background" />
    </div>
  );
}

export default function ContentPageForm() {
  const [, editParams] = useRoute("/content/:id/edit");
  const isEdit = !!editParams?.id;
  const pageId = isEdit ? parseInt(editParams.id) : undefined;

  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: page, isLoading } = useGetContentPage(pageId || 0, {
    query: { enabled: isEdit && !!pageId }
  });

  const createMutation = useCreateContentPage();
  const updateMutation = useUpdateContentPage();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sortOrder, setSortOrder] = useState<number>(0);

  useEffect(() => {
    if (page && isEdit) {
      setTitle(page.title);
      setContent(page.content || "");
      setImageUrl(page.imageUrl || "");
      setSortOrder(page.sortOrder);
    }
  }, [page, isEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return toast({ title: "Title is required", variant: "destructive" });

    const payload = {
      title,
      content: content || undefined,
      imageUrl: imageUrl || undefined,
      sortOrder
    };

    if (isEdit && pageId) {
      updateMutation.mutate({ id: pageId, data: payload }, {
        onSuccess: () => {
          toast({ title: "Page saved successfully" });
          queryClient.invalidateQueries({ queryKey: ["/api/content-pages"] });
          navigate("/content");
        },
        onError: (err: any) => toast({ title: "Save failed", description: err.message, variant: "destructive" })
      });
    } else {
      createMutation.mutate({ data: payload }, {
        onSuccess: () => {
          toast({ title: "Page created successfully" });
          queryClient.invalidateQueries({ queryKey: ["/api/content-pages"] });
          navigate("/content");
        },
        onError: (err: any) => toast({ title: "Creation failed", description: err.message, variant: "destructive" })
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isEdit && isLoading) {
    return <Layout><div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" /></div></Layout>;
  }

  return (
    <Layout>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/content")} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {isEdit ? "Edit Content Page" : "New Content Page"}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">Page Title</Label>
                <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Company Vision" required className="text-lg font-medium" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input id="sortOrder" type="number" value={sortOrder} onChange={e => setSortOrder(parseInt(e.target.value))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">Header Image URL (Optional)</Label>
              <Input id="imageUrl" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." />
              {imageUrl && <img src={imageUrl} alt="Preview" className="h-32 object-cover rounded mt-2 border border-border" />}
            </div>

            <div className="space-y-2">
              <Label>Page Content</Label>
              <RichTextEditor value={content} onChange={setContent} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate("/content")}>Cancel</Button>
          <Button type="submit" disabled={isPending} className="min-w-32">
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Page
          </Button>
        </div>
      </form>
    </Layout>
  );
}
