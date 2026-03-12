import { 
  LayoutDashboard, 
  PackageSearch, 
  Settings2, 
  Tags, 
  FileText, 
  Download, 
  ActivitySquare,
  ChevronRight,
  Loader2,
  Users,
  Shield,
  LogOut
} from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useListCategories } from "@workspace/api-client-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function AppSidebar() {
  const [location] = useLocation();
  const { data: categories, isLoading } = useListCategories();
  const { user, logout } = useAuth();

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  const isAdmin = user?.role?.name === 'Admin';

  return (
    <Sidebar variant="sidebar" className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 p-1.5 rounded-xl shadow-sm">
            <img 
              src={`${import.meta.env.BASE_URL}images/kcpl-logo-mark.png`} 
              alt="KCPL Logo" 
              className="w-6 h-6 object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-lg tracking-wider leading-none text-sidebar-foreground">KCPL</span>
            <span className="text-[0.65rem] text-sidebar-foreground/60 uppercase tracking-widest leading-none mt-1">Catalog Admin</span>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase tracking-wider text-xs font-display">Overview</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild data-active={isActive("/")} className="data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:font-medium transition-colors hover:bg-sidebar-accent/50 rounded-lg">
                  <Link href="/">
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Catalog Management */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase tracking-wider text-xs font-display">Catalog</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <Collapsible defaultOpen className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="transition-colors hover:bg-sidebar-accent/50 rounded-lg">
                      <PackageSearch className="w-4 h-4" />
                      <span>Products</span>
                      <ChevronRight className="ml-auto w-4 h-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {isLoading ? (
                        <div className="flex items-center p-2 text-sm text-sidebar-foreground/50">
                          <Loader2 className="w-3 h-3 mr-2 animate-spin" /> Loading...
                        </div>
                      ) : categories?.map((cat) => (
                        <SidebarMenuSubItem key={cat.id}>
                          <SidebarMenuSubButton asChild data-active={isActive(`/products/${cat.slug}`)} className="data-[active=true]:bg-sidebar-accent transition-colors hover:bg-sidebar-accent/50 rounded-lg">
                            <Link href={`/products/${cat.slug}`}>
                              <span>{cat.name}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild data-active={isActive('/products/all')} className="data-[active=true]:bg-sidebar-accent transition-colors hover:bg-sidebar-accent/50 rounded-lg">
                          <Link href="/products/all">
                            <span>All Products</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              <SidebarMenuItem>
                <SidebarMenuButton asChild data-active={isActive("/categories")} className="data-[active=true]:bg-sidebar-accent transition-colors hover:bg-sidebar-accent/50 rounded-lg">
                  <Link href="/categories">
                    <Tags className="w-4 h-4" />
                    <span>Categories</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Content & Publishing */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase tracking-wider text-xs font-display">Publishing</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild data-active={isActive("/catalog-index")} className="data-[active=true]:bg-sidebar-accent transition-colors hover:bg-sidebar-accent/50 rounded-lg">
                  <Link href="/catalog-index">
                    <Settings2 className="w-4 h-4" />
                    <span>Catalog Index</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild data-active={isActive("/content")} className="data-[active=true]:bg-sidebar-accent transition-colors hover:bg-sidebar-accent/50 rounded-lg">
                  <Link href="/content">
                    <FileText className="w-4 h-4" />
                    <span>Content Pages</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild data-active={isActive("/export")} className="data-[active=true]:bg-sidebar-accent transition-colors hover:bg-sidebar-accent/50 rounded-lg">
                  <Link href="/export">
                    <Download className="w-4 h-4" />
                    <span>Export Engine</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* System */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase tracking-wider text-xs font-display">System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild data-active={isActive("/logs")} className="data-[active=true]:bg-sidebar-accent transition-colors hover:bg-sidebar-accent/50 rounded-lg">
                  <Link href="/logs">
                    <ActivitySquare className="w-4 h-4" />
                    <span>Activity Logs</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              {isAdmin && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild data-active={isActive("/users")} className="data-[active=true]:bg-sidebar-accent transition-colors hover:bg-sidebar-accent/50 rounded-lg">
                      <Link href="/users">
                        <Users className="w-4 h-4" />
                        <span>Users</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild data-active={isActive("/roles")} className="data-[active=true]:bg-sidebar-accent transition-colors hover:bg-sidebar-accent/50 rounded-lg">
                      <Link href="/roles">
                        <Shield className="w-4 h-4" />
                        <span>Roles</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 bg-primary/10 text-primary border border-primary/20">
              <AvatarFallback className="font-medium text-xs">
                {user?.username?.substring(0, 2).toUpperCase() || 'AD'}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium leading-none truncate">{user?.username || 'Admin'}</span>
              <span className="text-xs text-sidebar-foreground/60 mt-1 truncate">{user?.role?.name || 'Administrator'}</span>
            </div>
          </div>
          <button 
            onClick={logout}
            className="text-sidebar-foreground/60 hover:text-destructive transition-colors p-2 rounded-md hover:bg-sidebar-accent"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
