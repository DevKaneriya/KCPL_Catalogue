import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGetContentPage, useCreateContentPage, useUpdateContentPage } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Loader2, Bold, Italic, Underline, List, ListOrdered, Heading1, Heading2, Heading3, Link as LinkIcon, AlignLeft, AlignCenter, AlignRight, ImageIcon } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import UnderlineExt from "@tiptap/extension-underline";
import LinkExt from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import ImageExt from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { useQueryClient } from "@tanstack/react-query";
import { ImageUpload } from "@/components/image-upload";

function RichTextEditor({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      UnderlineExt,
      LinkExt.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      ImageExt,
      Placeholder.configure({ placeholder: "Start typing here..." })
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  if (!editor) return null;

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL', previousUrl)
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const addImage = () => {
    const url = window.prompt('Image URL')
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-border/50 bg-muted/30">
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => editor.chain().focus().toggleBold().run()} data-active={editor.isActive("bold")}>
          <Bold className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => editor.chain().focus().toggleItalic().run()} data-active={editor.isActive("italic")}>
          <Italic className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => editor.chain().focus().toggleUnderline().run()} data-active={editor.isActive("underline")}>
          <Underline className="w-4 h-4" />
        </Button>
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} data-active={editor.isActive("heading", { level: 1 })}>
          <Heading1 className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} data-active={editor.isActive("heading", { level: 2 })}>
          <Heading2 className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} data-active={editor.isActive("heading", { level: 3 })}>
          <Heading3 className="w-4 h-4" />
        </Button>
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => editor.chain().focus().toggleBulletList().run()} data-active={editor.isActive("bulletList")}>
          <List className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => editor.chain().focus().toggleOrderedList().run()} data-active={editor.isActive("orderedList")}>
          <ListOrdered className="w-4 h-4" />
        </Button>
        
        <div className="w-px h-6 bg-border mx-1" />

        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => editor.chain().focus().setTextAlign('left').run()} data-active={editor.isActive({ textAlign: 'left' })}>
          <AlignLeft className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => editor.chain().focus().setTextAlign('center').run()} data-active={editor.isActive({ textAlign: 'center' })}>
          <AlignCenter className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => editor.chain().focus().setTextAlign('right').run()} data-active={editor.isActive({ textAlign: 'right' })}>
          <AlignRight className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={setLink} data-active={editor.isActive("link")}>
          <LinkIcon className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={addImage}>
          <ImageIcon className="w-4 h-4" />
        </Button>
      </div>
      <EditorContent editor={editor} className="prose prose-sm dark:prose-invert max-w-none p-6 min-h-[400px] focus-within:outline-none bg-background text-foreground" />
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
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
            {isEdit ? "Edit Content Page" : "New Content Page"}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl">
        <Card className="border-border/50 shadow-sm rounded-xl overflow-hidden">
          <CardContent className="p-6 space-y-6 bg-muted/5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title" className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Page Title</Label>
                <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Company Vision" required className="text-lg font-medium h-12" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sortOrder" className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Sort Order</Label>
                <Input id="sortOrder" type="number" value={sortOrder} onChange={e => setSortOrder(parseInt(e.target.value))} className="h-12" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Header Image (Optional)</Label>
              <ImageUpload value={imageUrl} onChange={setImageUrl} />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Page Content</Label>
              <RichTextEditor value={content} onChange={setContent} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate("/content")}>Cancel</Button>
          <Button type="submit" disabled={isPending} className="min-w-32 shadow-lg shadow-primary/20">
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Page
          </Button>
        </div>
      </form>
    </Layout>
  );
}
