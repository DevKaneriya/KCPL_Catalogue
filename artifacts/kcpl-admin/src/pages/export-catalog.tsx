import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useExportCatalog, useListCategories } from "@workspace/api-client-react";
import { Download, FileOutput, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ExportCatalog() {
  const { data: categories } = useListCategories();
  const exportMutation = useExportCatalog();
  const { toast } = useToast();

  const [format, setFormat] = useState<"pdf" | "doc" | "cdr">("pdf");
  const [sections, setSections] = useState<string[]>(['content', 'index']);
  const [result, setResult] = useState<{ url?: string; time?: string } | null>(null);

  const toggleSection = (id: string) => {
    setSections(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleExport = () => {
    if (sections.length === 0) {
      return toast({ title: "Select at least one section to export", variant: "destructive" });
    }

    setResult(null);
    exportMutation.mutate(
      { data: { format, sections } },
      {
        onSuccess: (data) => {
          toast({ title: "Export generated successfully" });
          setResult({ url: data.downloadUrl || '#', time: data.exportedAt });
        },
        onError: (err: any) => {
          toast({ title: "Export failed", description: err.message, variant: "destructive" });
        }
      }
    );
  };

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground flex items-center gap-3">
          <Download className="w-8 h-8 text-primary" />
          Export Engine
        </h1>
        <p className="text-muted-foreground mt-1">Compile and generate full product catalogs for print or digital distribution.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl">
        <Card className="border-border/50 bg-card">
          <CardHeader className="border-b border-border/50 bg-muted/20">
            <CardTitle className="font-display">Configuration</CardTitle>
            <CardDescription>Select what to include in the catalog</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-8">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Standard Sections</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Checkbox id="sec-content" checked={sections.includes('content')} onCheckedChange={() => toggleSection('content')} />
                  <Label htmlFor="sec-content" className="text-base cursor-pointer">Content Pages (Preface, Vision)</Label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox id="sec-index" checked={sections.includes('index')} onCheckedChange={() => toggleSection('index')} />
                  <Label htmlFor="sec-index" className="text-base cursor-pointer">Brand Index Tree</Label>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Product Categories</h3>
              <div className="space-y-3">
                {categories?.map(cat => (
                  <div key={cat.id} className="flex items-center space-x-3">
                    <Checkbox 
                      id={`sec-cat-${cat.id}`} 
                      checked={sections.includes(`cat-${cat.id}`)} 
                      onCheckedChange={() => toggleSection(`cat-${cat.id}`)} 
                    />
                    <Label htmlFor={`sec-cat-${cat.id}`} className="text-base cursor-pointer">{cat.name}</Label>
                  </div>
                ))}
                {!categories?.length && <div className="text-sm text-muted-foreground">No categories available.</div>}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border/50">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Output Format</h3>
              <RadioGroup value={format} onValueChange={(val: any) => setFormat(val)} className="flex gap-6">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pdf" id="fmt-pdf" />
                  <Label htmlFor="fmt-pdf" className="cursor-pointer">PDF Document</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="doc" id="fmt-doc" />
                  <Label htmlFor="fmt-doc" className="cursor-pointer">Word (DOC)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cdr" id="fmt-cdr" />
                  <Label htmlFor="fmt-cdr" className="cursor-pointer">CorelDraw (CDR)</Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
          <CardFooter className="border-t border-border/50 p-6 bg-muted/10">
            <Button 
              size="lg" 
              className="w-full font-bold text-lg hover-elevate shadow-lg shadow-primary/25"
              onClick={handleExport}
              disabled={exportMutation.isPending}
            >
              {exportMutation.isPending ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Compiling Catalog...</>
              ) : (
                <><FileOutput className="w-5 h-5 mr-2" /> Generate Catalog</>
              )}
            </Button>
          </CardFooter>
        </Card>

        {result && (
          <Card className="border-primary/30 bg-primary/5 h-fit shadow-xl shadow-primary/10">
            <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-600 flex items-center justify-center mb-2">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-display font-bold">Ready for Download</h3>
              <p className="text-muted-foreground">Your catalog has been successfully generated based on your selection.</p>
              
              <Button asChild size="lg" className="w-full mt-6 bg-foreground text-background hover:bg-foreground/90">
                <a href={result.url} target="_blank" rel="noopener noreferrer">
                  Download {format.toUpperCase()}
                </a>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
