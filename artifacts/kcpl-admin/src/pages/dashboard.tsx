import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGetCatalogStats } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Package, Thermometer, Box, FileOutput, Activity, ArrowRight, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { data: stats, isLoading, error } = useGetCatalogStats();

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Overview</h1>
          <p className="text-muted-foreground mt-1">Real-time catalog metrics and recent activity.</p>
        </div>
        <Button asChild className="hover-elevate shadow-lg shadow-primary/20 shrink-0">
          <Link href="/export">
            <FileOutput className="w-4 h-4 mr-2" />
            Quick Export Catalog
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-border/50">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="p-8 bg-destructive/10 text-destructive border border-destructive/20 rounded-md mb-8">
          Failed to load dashboard statistics.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats?.topCategories?.map((cat, i) => (
              <motion.div key={cat.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * (i + 1) }}>
                <Card className="border-border/50 bg-card hover-elevate transition-all duration-300">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Total {cat.name}</CardTitle>
                    {cat.name.toLowerCase().includes('condenser') ? <Box className="h-4 w-4 text-primary" /> : <Thermometer className="h-4 w-4 text-primary" />}
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-display font-bold">{cat.count.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground mt-1">Active SKUs</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}

            {Array.from({ length: Math.max(0, 2 - (stats?.topCategories?.length || 0)) }).map((_, i) => (
              <motion.div key={`empty-${i}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * ((stats?.topCategories?.length || 0) + i + 1) }}>
                <Card className="border-border/50 bg-card/40">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Category</CardTitle>
                    <Box className="h-4 w-4 text-muted-foreground/30" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-display font-bold text-muted-foreground/50">--</div>
                    <p className="text-xs text-muted-foreground mt-1 text-muted-foreground/50">No data</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="border-border/50 bg-card hover-elevate transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">All Products</CardTitle>
                  <Package className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-display font-bold">{stats?.totalProducts.toLocaleString() || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Across all categories</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card className="border-border/50 bg-card hover-elevate transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Last Updated</CardTitle>
                  <Activity className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold mt-1">
                    {stats?.lastUpdated ? format(new Date(stats.lastUpdated), 'MMM d, yyyy') : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {stats?.lastUpdated ? format(new Date(stats.lastUpdated), 'HH:mm:ss') : ''}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="col-span-1 lg:col-span-2 border-border/50">
              <CardHeader>
                <CardTitle className="font-display">Recent Activity</CardTitle>
                <CardDescription>Latest changes to the catalog system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {stats?.recentActivity?.length ? (
                    stats.recentActivity.map((log, i) => (
                      <div key={log.id} className="flex items-start gap-4">
                        <div className="w-2 h-2 mt-2 rounded-full bg-primary ring-4 ring-primary/10 shrink-0" />
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium leading-none">
                            <span className="capitalize font-bold">{log.action}</span> {log.entityType.replace('_', ' ')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {log.details}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground shrink-0 tabular-nums">
                          {format(new Date(log.createdAt), 'MMM d, HH:mm')}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">No recent activity</div>
                  )}
                </div>
                <div className="mt-6 pt-4 border-t border-border/50">
                  <Button variant="ghost" asChild className="w-full text-muted-foreground hover:text-foreground">
                    <Link href="/logs">
                      View all activity logs <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-1 border-border/50">
              <CardHeader>
                <CardTitle className="font-display">Breakdown</CardTitle>
                <CardDescription>Products by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.categoryBreakdown?.map(cat => (
                    <div key={cat.name} className="flex items-center">
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">{cat.name}</p>
                      </div>
                      <div className="font-bold font-display text-lg">
                        {cat.count.toLocaleString()}
                      </div>
                    </div>
                  ))}
                  {!stats?.categoryBreakdown?.length && (
                    <div className="text-sm text-muted-foreground py-4">No categories configured.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </Layout>
  );
}
