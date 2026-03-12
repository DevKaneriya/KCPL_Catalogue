import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useExportCatalog, useListCategories, useGetCatalogPreviewData } from "@workspace/api-client-react";
import { Download, Loader2, CheckCircle2, ChevronRight, ChevronLeft, Eye, FileText, Settings2, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ExportCatalog() {
  const { data: categories } = useListCategories();
  const exportMutation = useExportCatalog();
  const { toast } = useToast();

  const [searchParams] = useState(() => new URLSearchParams(window.location.search));
  const defaultCategory = searchParams.get('category');

  const [step, setStep] = useState(1);
  const [sections, setSections] = useState<string[]>(
    defaultCategory && defaultCategory !== 'all' 
      ? ['content', 'index', `cat-${defaultCategory}`] 
      : ['content', 'index']
  );
  const [result, setResult] = useState<{ url?: string; time?: string } | null>(null);

  const { data: previewData, isLoading: isPreviewLoading } = useGetCatalogPreviewData(
    { data: { sections } },
    { query: { enabled: step === 2 } }
  );

  const toggleSection = (id: string) => {
    setSections(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    const allCatIds = categories?.map(c => `cat-${c.id}`) || [];
    setSections(['content', 'index', ...allCatIds]);
  };

  const deselectAll = () => {
    setSections([]);
  };

  const handleExport = () => {
    if (sections.length === 0) {
      return toast({ title: "Select at least one section to export", variant: "destructive" });
    }

    setStep(3);
    setResult(null);

    // Give UI time to update before blocking thread with print/canvas if we go that route
    // For now we'll rely on the API
    exportMutation.mutate(
      { data: { format: "pdf", sections } },
      {
        onSuccess: (data) => {
          toast({ title: "Export generated successfully" });
          setResult({ url: data.downloadUrl || '#', time: data.exportedAt });
        },
        onError: (err: any) => {
          toast({ title: "Export failed", description: err.message, variant: "destructive" });
          setStep(2); // Go back on error
        }
      }
    );
  };

  return (
    <Layout>
      <div className="mb-8 max-w-5xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground flex items-center gap-3">
          <Download className="w-8 h-8 text-primary" />
          Export Engine
        </h1>
        <p className="text-muted-foreground mt-1">Compile and generate full product catalogs for print or digital distribution.</p>

        {/* Stepper */}
        <div className="flex items-center justify-between mt-8 relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-border/50 -z-10" />
          
          {[1, 2, 3].map((num) => (
            <div key={num} className={`flex flex-col items-center gap-2 bg-background px-4 ${step === num ? 'opacity-100' : 'opacity-50'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors ${
                step > num ? 'bg-primary border-primary text-primary-foreground' :
                step === num ? 'border-primary text-primary bg-primary/10' :
                'border-border text-muted-foreground bg-muted'
              }`}>
                {step > num ? <CheckCircle2 className="w-5 h-5" /> : num}
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider hidden sm:block">
                {num === 1 ? 'Selection' : num === 2 ? 'Preview' : 'Generate'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto">
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-border/50 shadow-sm rounded-xl overflow-hidden">
              <div className="bg-muted/20 px-6 py-4 border-b border-border/50 flex justify-between items-center">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-primary" />
                  Configure Catalog Content
                </h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll} className="h-8 text-xs">Select All</Button>
                  <Button variant="outline" size="sm" onClick={deselectAll} className="h-8 text-xs">Deselect All</Button>
                </div>
              </div>
              
              <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/50">
                  <div className="p-6 space-y-6">
                    <div>
                      <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Standard Pages</h4>
                      <div className="space-y-4">
                        <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${sections.includes('content') ? 'bg-primary/5 border-primary/30' : 'bg-transparent border-border/50 hover:border-primary/50'}`}>
                          <Checkbox id="sec-content" checked={sections.includes('content')} onCheckedChange={() => toggleSection('content')} className="mt-1" />
                          <div className="space-y-1">
                            <span className="font-medium block leading-none">Content Pages</span>
                            <span className="text-xs text-muted-foreground block">Preface, About Company, Vision</span>
                          </div>
                          <FileText className="w-5 h-5 ml-auto text-muted-foreground opacity-50" />
                        </label>

                        <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${sections.includes('index') ? 'bg-primary/5 border-primary/30' : 'bg-transparent border-border/50 hover:border-primary/50'}`}>
                          <Checkbox id="sec-index" checked={sections.includes('index')} onCheckedChange={() => toggleSection('index')} className="mt-1" />
                          <div className="space-y-1">
                            <span className="font-medium block leading-none">Product Index</span>
                            <span className="text-xs text-muted-foreground block">Hierarchical brand/size tree</span>
                          </div>
                          <FileText className="w-5 h-5 ml-auto text-muted-foreground opacity-50" />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    <div>
                      <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Product Categories</h4>
                      <div className="space-y-3">
                        {categories?.map(cat => (
                          <label key={cat.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${sections.includes(`cat-${cat.id}`) ? 'bg-primary/5 border-primary/30' : 'bg-transparent border-border/50 hover:border-primary/50'}`}>
                            <Checkbox 
                              id={`sec-cat-${cat.id}`} 
                              checked={sections.includes(`cat-${cat.id}`)} 
                              onCheckedChange={() => toggleSection(`cat-${cat.id}`)} 
                            />
                            <span className="font-medium">{cat.name}</span>
                            <Badge variant="outline" className="ml-auto text-xs bg-background">{cat.productCount} SKUs</Badge>
                          </label>
                        ))}
                        {!categories?.length && <div className="text-sm text-muted-foreground py-4 text-center">No categories available.</div>}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end mt-6">
              <Button size="lg" className="shadow-lg shadow-primary/20 min-w-40 h-12 text-base" onClick={() => {
                if (sections.length === 0) return toast({ title: "Select at least one section", variant: "destructive" });
                setStep(2);
              }}>
                Next: Preview <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <Card className="border-border/50 shadow-sm rounded-xl overflow-hidden bg-muted/10">
              <div className="bg-muted/20 px-6 py-4 border-b border-border/50 flex justify-between items-center">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Eye className="w-5 h-5 text-primary" />
                  Catalog Preview
                </h3>
              </div>
              
              <CardContent className="p-6">
                {isPreviewLoading ? (
                  <div className="h-96 flex flex-col items-center justify-center text-muted-foreground">
                    <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
                    <p>Generating print preview...</p>
                  </div>
                ) : (
                  <div className="aspect-[16/9] md:aspect-[21/9] w-full bg-slate-900 rounded-xl overflow-hidden shadow-2xl relative flex border border-slate-800">
                    {/* Simulated Book Layout */}
                    
                    {/* Left Page (Dark Mode / Index style) */}
                    <div className="w-1/2 h-full bg-slate-900 border-r border-slate-800 p-8 overflow-y-auto hidden md:block">
                      <div className="space-y-6">
                        <div className="h-4 w-32 bg-slate-800 rounded"></div>
                        <div className="h-8 w-64 bg-slate-800 rounded"></div>
                        
                        <div className="space-y-4 mt-8">
                          {[1,2,3,4].map(i => (
                            <div key={i} className="flex gap-4">
                              <div className="h-4 w-24 bg-slate-800 rounded"></div>
                              <div className="flex-1 border-b border-slate-800 border-dashed mb-2"></div>
                              <div className="h-4 w-12 bg-slate-800 rounded"></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right Page (Light Mode / Product Grid style) */}
                    <div className="w-full md:w-1/2 h-full bg-white p-6 sm:p-8 overflow-y-auto">
                      {/* Header */}
                      <div className="flex justify-between items-end border-b-2 border-teal-600 pb-4 mb-6">
                        <div className="h-10 w-40 bg-teal-100 rounded"></div>
                        <div className="h-6 w-24 bg-slate-100 rounded"></div>
                      </div>

                      {/* Product Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[1,2,3,4,5,6,7,8].map(i => (
                          <div key={i} className="border border-slate-200 p-2 text-center rounded-lg">
                            <div className="w-full aspect-square bg-slate-100 mb-2 flex items-center justify-center rounded">
                              <ImageIcon className="w-6 h-6 text-slate-300" />
                            </div>
                            <div className="h-3 w-3/4 bg-slate-200 mx-auto rounded mb-1"></div>
                            <div className="h-2 w-1/2 bg-slate-100 mx-auto rounded"></div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Footer */}
                      <div className="mt-8 flex justify-between text-slate-300">
                        <div className="h-3 w-20 bg-slate-100 rounded"></div>
                        <div className="h-3 w-8 bg-slate-100 rounded"></div>
                      </div>
                    </div>

                    {/* Center Bind */}
                    <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-8 bg-gradient-to-r from-transparent via-black/20 to-transparent hidden md:block pointer-events-none"></div>
                  </div>
                )}
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  Preview shows a structural representation. Final PDF will be high resolution.
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between mt-6">
              <Button variant="outline" size="lg" className="h-12" onClick={() => setStep(1)}>
                <ChevronLeft className="w-5 h-5 mr-2" /> Back
              </Button>
              <Button size="lg" className="shadow-lg shadow-primary/20 min-w-40 h-12 text-base" onClick={handleExport}>
                Generate PDF <Download className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 mt-12 max-w-2xl mx-auto">
            {!result ? (
              <Card className="border-border/50 shadow-lg">
                <CardContent className="p-12 flex flex-col items-center text-center space-y-6">
                  <div className="relative w-24 h-24">
                    <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FileText className="w-8 h-8 text-primary animate-pulse" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-display font-bold">Compiling Catalog...</h3>
                    <p className="text-muted-foreground mt-2">Generating high-resolution PDF. This may take a minute for large catalogs.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-green-500/30 bg-green-500/5 shadow-xl shadow-green-500/10">
                <CardContent className="p-12 flex flex-col items-center text-center space-y-6">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }}>
                    <div className="w-20 h-20 rounded-full bg-green-500/20 text-green-600 flex items-center justify-center">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                  </motion.div>
                  
                  <div>
                    <h3 className="text-3xl font-display font-bold text-foreground">Ready for Download</h3>
                    <p className="text-muted-foreground mt-2">Your catalog has been successfully generated.</p>
                  </div>
                  
                  <div className="flex gap-4 pt-4 w-full">
                    <Button variant="outline" size="lg" className="flex-1 h-14 text-base" onClick={() => setStep(1)}>
                      Start Over
                    </Button>
                    <Button asChild size="lg" className="flex-1 h-14 text-base bg-foreground text-background hover:bg-foreground/90 shadow-xl">
                      <a href={result.url} target="_blank" rel="noopener noreferrer">
                        <Download className="w-5 h-5 mr-2" /> Download PDF
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

// Ensure framer-motion is used for the success animation
import { motion } from "framer-motion";

