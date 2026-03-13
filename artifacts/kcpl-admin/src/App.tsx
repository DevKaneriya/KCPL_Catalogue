import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./contexts/auth-context";

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
import Users from "./pages/users";
import Roles from "./pages/roles";
import LoginPage from "./pages/login";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { token, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !token) {
      setLocation("/login");
    }
  }, [token, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!token) return null;

  return <Route {...rest} component={Component} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <ProtectedRoute path="/" component={Dashboard} />
      
      {/* Product Routes */}
      <ProtectedRoute path="/products/:categorySlug" component={Products} />
      <ProtectedRoute path="/products/:categorySlug/new" component={ProductForm} />
      <ProtectedRoute path="/products/:categorySlug/:id/edit" component={ProductForm} />
      
      {/* Category Routes */}
      <ProtectedRoute path="/categories" component={Categories} />
      
      {/* Content Pages */}
      <ProtectedRoute path="/content" component={ContentPages} />
      <ProtectedRoute path="/content/new" component={ContentPageForm} />
      <ProtectedRoute path="/content/:id/edit" component={ContentPageForm} />
      
      {/* Tools */}
      <ProtectedRoute path="/catalog-index" component={CatalogIndex} />
      <ProtectedRoute path="/export" component={ExportCatalog} />
      <ProtectedRoute path="/logs" component={ActivityLogs} />

      {/* Admin */}
      <ProtectedRoute path="/users" component={Users} />
      <ProtectedRoute path="/roles" component={Roles} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
