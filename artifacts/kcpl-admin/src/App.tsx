import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Pages
import Dashboard from "./pages/dashboard";
import Products from "./pages/products";
import ProductForm from "./pages/product-form";
import Categories from "./pages/categories";
import ContentPages from "./pages/content-pages";
import ContentPageForm from "./pages/content-page-form";
import CatalogIndex from "./pages/catalog-index";
import ExportCatalog from "./pages/export-catalog";
import ActivityLogs from "./pages/activity-logs";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      
      {/* Product Routes */}
      <Route path="/products/:categorySlug" component={Products} />
      <Route path="/products/:categorySlug/new" component={ProductForm} />
      <Route path="/products/:categorySlug/:id/edit" component={ProductForm} />
      
      {/* Category Routes */}
      <Route path="/categories" component={Categories} />
      
      {/* Content Pages */}
      <Route path="/content" component={ContentPages} />
      <Route path="/content/new" component={ContentPageForm} />
      <Route path="/content/:id/edit" component={ContentPageForm} />
      
      {/* Tools */}
      <Route path="/catalog-index" component={CatalogIndex} />
      <Route path="/export" component={ExportCatalog} />
      <Route path="/logs" component={ActivityLogs} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
