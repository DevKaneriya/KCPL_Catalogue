import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useGetCatalogIndex } from "@workspace/api-client-react";
import { Settings2, Car, Maximize, Search, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function CatalogIndex() {
  const { data: tree, isLoading } = useGetCatalogIndex();

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground flex items-center gap-3">
          <Settings2 className="w-8 h-8 text-primary" />
          Catalog Index
        </h1>
        <p className="text-muted-foreground mt-1">Auto-generated hierarchical view of products by Brand and Size.</p>
      </div>

      <Card className="border-border/50">
        <CardHeader className="bg-muted/30 border-b border-border/50">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="w-5 h-5 text-muted-foreground" />
            Index Tree Explorer
          </CardTitle>
          <CardDescription>Browse SKUs organized by Vehicle Brand &rarr; Dimensions</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              Generating index...
            </div>
          ) : tree?.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No index data available. Add products with Brands and Sizes to populate.
            </div>
          ) : (
            <Accordion type="multiple" className="w-full">
              {tree?.map((brandNode, idx) => (
                <AccordionItem value={`brand-${idx}`} key={brandNode.brand || 'unknown'} className="border-b border-border/50 px-4">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3 w-full">
                      <div className="p-2 bg-primary/10 text-primary rounded-md">
                        <Car className="w-5 h-5" />
                      </div>
                      <span className="font-display font-bold text-xl uppercase tracking-wider">
                        {brandNode.brand || 'Unbranded'}
                      </span>
                      <Badge variant="secondary" className="ml-auto font-mono">
                        {brandNode.sizes.length} Sizes
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-6">
                    <div className="pl-12 pr-4 space-y-4">
                      {brandNode.sizes.map((sizeNode, sIdx) => (
                        <Card key={`${brandNode.brand}-${sizeNode.size}-${sIdx}`} className="bg-muted/10 border-border shadow-none">
                          <div className="p-3 border-b border-border/50 bg-background/50 flex items-center gap-2">
                            <Maximize className="w-4 h-4 text-primary/70" />
                            <span className="font-semibold">{sizeNode.size || 'No Size Specified'}</span>
                            <span className="ml-auto text-xs text-muted-foreground font-mono">{sizeNode.products.length} SKUs</span>
                          </div>
                          <div className="p-0">
                            <ul className="divide-y divide-border/30">
                              {sizeNode.products.map(prod => (
                                <li key={prod.id} className="p-3 flex justify-between items-center hover:bg-muted/30 transition-colors">
                                  <div className="flex items-center gap-3">
                                    {prod.imageUrl ? (
                                      <img src={prod.imageUrl} alt="" className="w-8 h-8 rounded bg-background object-cover border border-border" />
                                    ) : (
                                      <div className="w-8 h-8 rounded bg-background border border-border border-dashed" />
                                    )}
                                    <div>
                                      <p className="font-medium text-sm leading-none">{prod.name || 'Unnamed'}</p>
                                      <p className="text-xs text-muted-foreground mt-1 font-mono">{prod.kcplCode} / {prod.skuCode}</p>
                                    </div>
                                  </div>
                                  <Badge variant="outline" className="text-xs capitalize">{prod.productType}</Badge>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}
