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
import { useGetProduct, useCreateProduct, useUpdateProduct, useListCategories } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useQueryClient } from "@tanstack/react-query";
import { ImageUpload } from "@/components/image-upload";

const formSchema = z.object({
  categoryId: z.coerce.number().optional(),
  name: z.string().optional(),
  skuCode: z.string().optional(),
  kcplCode: z.string().optional(),
  vehicleBrand: z.string().optional(),
  engineBrand: z.string().optional(),
  productType: z.string().optional(),
  size: z.string().optional(),
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
    query: { enabled: isEdit && !!productId }
  });
  
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      categoryId: undefined,
      name: "",
      skuCode: "",
      kcplCode: "",
      vehicleBrand: "",
      engineBrand: "",
      productType: "",
      size: "",
      imageUrl: "",
    },
  });

  useEffect(() => {
    if (product && isEdit) {
      form.reset({
        categoryId: product.categoryId,
        name: product.name || "",
        skuCode: product.skuCode || "",
        kcplCode: product.kcplCode || "",
        vehicleBrand: product.vehicleBrand || "",
        engineBrand: product.engineBrand || "",
        productType: product.productType || "",
        size: product.size || "",
        imageUrl: product.imageUrl || "",
      });
    } else if (!isEdit && categories && slug && slug !== 'all') {
      const cat = categories.find(c => c.slug === slug);
      if (cat) form.setValue('categoryId', cat.id);
    }
  }, [product, isEdit, categories, slug, form]);

  const onSubmit = (values: FormValues) => {
    // Clean empty strings to undefined for API
    const cleanValues = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, v === "" ? undefined : v])
    );

    if (isEdit && productId) {
      updateMutation.mutate(
        { id: productId, data: cleanValues },
        {
          onSuccess: () => {
            toast({ title: "Product updated successfully" });
            queryClient.invalidateQueries({ queryKey: ["/api/products"] });
            navigate(`/products/${slug}`);
          },
          onError: (err: any) => {
            toast({ title: "Update failed", description: err.message, variant: "destructive" });
          }
        }
      );
    } else {
      createMutation.mutate(
        { data: cleanValues },
        {
          onSuccess: () => {
            toast({ title: "Product created successfully" });
            queryClient.invalidateQueries({ queryKey: ["/api/products"] });
            navigate(`/products/${slug}`);
          },
          onError: (err: any) => {
            toast({ title: "Creation failed", description: err.message, variant: "destructive" });
          }
        }
      );
    }
  };

  if (isEdit && isLoadingProduct) {
    return <Layout><div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" /></div></Layout>;
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

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
          <p className="text-muted-foreground mt-1">Fill out the details below. All fields are optional.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Main Details Card */}
              <Card className="border-border/50 shadow-sm rounded-xl overflow-hidden">
                <div className="bg-muted/30 px-6 py-4 border-b border-border/50">
                  <h3 className="font-semibold text-lg">Product Details</h3>
                </div>
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="categoryId" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Category</FormLabel>
                        <Select 
                          onValueChange={(val) => field.onChange(parseInt(val))} 
                          value={field.value?.toString() || ""}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-background h-11">
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories?.map(c => (
                              <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Product Name</FormLabel>
                        <FormControl><Input placeholder="e.g. Premium Radiator" className="h-11" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="kcplCode" render={({ field }) => (
                      <FormItem>
                        <FormLabel>KCPL Code (Internal)</FormLabel>
                        <FormControl><Input placeholder="e.g. KCP-102" className="font-mono h-11" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="skuCode" render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU Code</FormLabel>
                        <FormControl><Input placeholder="e.g. SKU-8849" className="font-mono h-11" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </CardContent>
              </Card>

              {/* Specifications Card */}
              <Card className="border-border/50 shadow-sm rounded-xl overflow-hidden">
                <div className="bg-muted/30 px-6 py-4 border-b border-border/50">
                  <h3 className="font-semibold text-lg">Specifications</h3>
                </div>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="vehicleBrand" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vehicle Brand</FormLabel>
                        <FormControl><Input placeholder="e.g. Toyota, Honda" className="h-11" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="engineBrand" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Engine Brand/Model</FormLabel>
                        <FormControl><Input placeholder="e.g. 2JZ-GTE" className="h-11" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="productType" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Type</FormLabel>
                        <FormControl><Input placeholder="e.g. Aluminum" className="h-11" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="size" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dimensions / Size</FormLabel>
                        <FormControl><Input placeholder="e.g. 600x400x42mm" className="h-11" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar / Image Upload */}
            <div className="space-y-8">
              <Card className="border-border/50 shadow-sm rounded-xl overflow-hidden">
                <div className="bg-muted/30 px-6 py-4 border-b border-border/50">
                  <h3 className="font-semibold text-lg">Product Image</h3>
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
