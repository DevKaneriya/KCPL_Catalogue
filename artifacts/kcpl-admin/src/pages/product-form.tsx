import { useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  useGetProduct, 
  useCreateProduct, 
  useUpdateProduct, 
  useListCategories,
  useGetProductFilters,
  useGetProductTypesMaster,
  useGetAppCats,
  useGetBrands
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Loader2, AlertCircle } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useQueryClient } from "@tanstack/react-query";
import { ImageUpload } from "@/components/image-upload";
import { FilterCombobox } from "@/components/filter-combobox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const formSchema = z.object({
  categoryId: z.coerce.number().optional().nullable(),
  applicationCategory: z.string().optional(),
  productType: z.string().min(1, "Product type is required"),
  brandName: z.string().optional(),
  kcplCode: z.string().min(1, "KCPL Code is required"),
  modelName: z.string().optional(),
  size: z.string().optional(),
  adaptablePartNo: z.string().optional(),
  imageUrl: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

export default function ProductForm() {
  const [, newParams] = useRoute("/products/:categorySlug/new");
  const [, editParams] = useRoute("/products/:categorySlug/:id/edit");
  
  const isEdit = !!editParams?.id;
  const productId = isEdit ? parseInt(editParams.id) : undefined;
  const slug = editParams?.categorySlug || newParams?.categorySlug || "all";
  
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: categories } = useListCategories();
  const { data: product, isLoading: isLoadingProduct } = useGetProduct(productId || 0, {
    query: { enabled: isEdit && !!productId, queryKey: [`/api/products/${productId}`] }
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      categoryId: undefined,
      applicationCategory: "",
      productType: "",
      brandName: "",
      kcplCode: "",
      modelName: "",
      size: "",
      adaptablePartNo: "",
      imageUrl: "",
    },
  });

  // Dynamic filter dependencies
  const selectedCategoryId = form.watch("categoryId");
  const selectedAppCat = form.watch("applicationCategory");
  const selectedType = form.watch("productType");

  const { data: dynamicFilters, isLoading: isLoadingFilters } = useGetProductFilters({
    categoryId: selectedCategoryId || undefined,
    applicationCategory: selectedAppCat || undefined,
    productType: selectedType || undefined
  });

  // Hierarchical Master Data
  const { data: masterProductTypes } = useGetProductTypesMaster();
  
  // Find matching product type ID for API queries
  const matchedTypeId = masterProductTypes?.find(t => t.name === selectedType)?.id;
  
  const { data: masterAppCats } = useGetAppCats({ 
    productTypeId: matchedTypeId 
  }, { 
    query: { 
      enabled: !!matchedTypeId,
      queryKey: ["/api/masters/application-categories", { productTypeId: matchedTypeId }]
    } 
  });
  
  // Find matching application category ID
  const matchedAppCatId = masterAppCats?.find(ac => ac.name === selectedAppCat)?.id;

  const { data: masterBrands } = useGetBrands({
    productTypeId: matchedTypeId,
    applicationCategoryId: matchedAppCatId
  }, {
    query: { 
      enabled: !!matchedTypeId,
      queryKey: ["/api/masters/brands", { productTypeId: matchedTypeId, applicationCategoryId: matchedAppCatId }]
    }
  });

  useEffect(() => {
    if (product && isEdit) {
      form.reset({
        categoryId: Number(product.categoryId),
        applicationCategory: (product as any).applicationCategory || "",
        productType: (product as any).productType || "",
        brandName: (product as any).brandName || "",
        kcplCode: product.kcplCode || "",
        modelName: (product as any).modelName || "",
        size: product.size || "",
        adaptablePartNo: (product as any).adaptablePartNo || "",
        imageUrl: product.imageUrl || "",
      });
    } else if (!isEdit && masterProductTypes && masterProductTypes.length > 0) {
      if (slug && slug !== 'all') {
        const decodedSlug = decodeURIComponent(slug);
        const matchedType = masterProductTypes.find(t => 
          t.name.toLowerCase() === decodedSlug.toLowerCase()
        );
        
        if (matchedType) {
          form.setValue("productType", matchedType.name);
          // Also try to find and set categoryId if it matches product type name
          const cat = categories?.find(c => 
            c.name.toLowerCase() === matchedType.name.toLowerCase() ||
            c.slug.toLowerCase() === matchedType.name.toLowerCase().replace(/s$/, '')
          );
          if (cat) {
            form.setValue("categoryId", cat.id);
          }
        } else {
          // Fallback to legacy category check
          const cat = categories?.find(c => c.slug === slug);
          if (cat) {
            form.setValue('categoryId', cat.id);
            if (masterProductTypes?.some(t => t.name === cat.name)) {
              form.setValue("productType", cat.name);
            }
          }
        }
      } else if (categories && categories.length > 0 && !form.getValues("categoryId")) {
        form.setValue("categoryId", categories[0].id);
      }
    }
  }, [product, isEdit, categories, slug, masterProductTypes, form.reset, form.setValue]);

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();

  const onSubmit = (values: FormValues) => {
    const cleanValues = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, v === "" ? undefined : v])
    );

    if (isEdit && productId) {
      updateMutation.mutate(
        { id: productId, data: cleanValues as any },
        {
          onSuccess: () => {
            toast({ title: "Product updated successfully" });
            queryClient.invalidateQueries({ queryKey: ["/api/products"] });
            queryClient.invalidateQueries({ queryKey: ["/api/products/filters"] });
            navigate(`/products/${slug}`);
          },
          onError: (err: any) => {
            toast({ title: "Update failed", description: err.message || "Internet server error", variant: "destructive" });
          }
        }
      );
    } else {
      createMutation.mutate(
        { data: cleanValues as any },
        {
          onSuccess: () => {
            toast({ title: "Product created successfully" });
            queryClient.invalidateQueries({ queryKey: ["/api/products"] });
            queryClient.invalidateQueries({ queryKey: ["/api/products/filters"] });
            navigate(`/products/${slug}`);
          },
          onError: (err: any) => {
            const msg = err.response?.data?.message || err.message || "Internal server error (possibly duplicate code)";
            toast({ title: "Creation failed", description: msg, variant: "destructive" });
          }
        }
      );
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const serverError = (createMutation.error as any) || (updateMutation.error as any);

  if (isEdit && isLoadingProduct) {
    return <Layout><div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" /></div></Layout>;
  }

  return (
    <Layout>
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/products/${slug}`)} className="rounded-full hover:bg-muted">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
            {isEdit ? "Edit Product" : "New Product"}
          </h1>
          <p className="text-muted-foreground mt-1">Manage product details and specifications.</p>
        </div>
      </div>

      {serverError && (
        <Alert variant="destructive" className="mb-6 bg-destructive/5 border-destructive/20">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Server Error</AlertTitle>
          <AlertDescription>
            {serverError.response?.data?.message || serverError.response?.data?.error || serverError.message || "An unexpected error occurred."}
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Card className="border-border/50 shadow-sm rounded-xl overflow-hidden">
                <div className="bg-muted/30 px-6 py-4 border-b border-border/50">
                  <h3 className="font-semibold text-lg">Identity & Classification</h3>
                </div>
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="productType" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Product Type*</FormLabel>
                        <FormControl>
                           <FilterCombobox 
                            placeholder="Select product type"
                            options={masterProductTypes?.map(t => t.name) || []}
                            value={field.value || ""}
                            onChange={(val) => {
                              field.onChange(val);
                              // Sync category ID in background
                              const matchedCat = categories?.find(c => c.name === val);
                              if (matchedCat) form.setValue("categoryId", matchedCat.id);
                              
                              form.setValue("applicationCategory", "");
                              form.setValue("brandName", "");
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="applicationCategory" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Application Category*</FormLabel>
                        <FormControl>
                          <FilterCombobox 
                            placeholder={selectedType ? "Select application" : "Select Product Type first"}
                            options={masterAppCats?.map(ac => ac.name) || []}
                            value={field.value || ""}
                            onChange={(val) => {
                              field.onChange(val);
                              form.setValue("brandName", "");
                            }}
                            disabled={!selectedType}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="brandName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Brand Name*</FormLabel>
                        <FormControl>
                          <FilterCombobox 
                            placeholder={selectedAppCat ? "Select brand" : "Select Application first"}
                            options={masterBrands?.map(b => b.name) || []}
                            value={field.value || ""}
                            onChange={field.onChange}
                            disabled={!selectedAppCat}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="kcplCode" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>KCPL Code (Unique ID)*</FormLabel>
                        <FormControl><Input placeholder="e.g. KCP-102" className="font-mono h-11 border-border/60" {...field} /></FormControl>
                        <FormDescription>This must be unique for every product.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="modelName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Model Name</FormLabel>
                        <FormControl><Input placeholder="e.g. Premium Model" className="h-11 border-border/60" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="size" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Size</FormLabel>
                        <FormControl><Input placeholder="e.g. 600x400x42mm" className="h-11 border-border/60" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="adaptablePartNo" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adaptable Part No</FormLabel>
                        <FormControl><Input placeholder="e.g. AP-0001" className="h-11 border-border/60" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-8">
              <Card className="border-border/50 shadow-sm rounded-xl overflow-hidden">
                <div className="bg-muted/30 px-6 py-4 border-b border-border/50">
                  <h3 className="font-semibold text-lg">Product Media</h3>
                </div>
                <CardContent className="p-6">
                  <FormField control={form.control} name="imageUrl" render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <ImageUpload value={field.value || ""} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              <div className="bg-card border border-border/50 rounded-xl p-6 shadow-sm flex flex-col gap-4 sticky top-20">
                <Button type="submit" disabled={isPending} size="lg" className="w-full shadow-lg shadow-primary/20 text-base">
                  {isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                  {isEdit ? "Save Changes" : "Create Product"}
                </Button>
                <Button type="button" variant="outline" size="lg" onClick={() => navigate(`/products/${slug}`)} className="w-full">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Form>
    </Layout>
  );
}
