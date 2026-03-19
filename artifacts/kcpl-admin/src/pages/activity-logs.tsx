import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useListActivityLogs } from "@workspace/api-client-react";
import { format } from "date-fns";
import { ActivitySquare, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ActivityLogs() {
  const [page, setPage] = useState(1);
  const limit = 50;

  const { data, isLoading, error } = useListActivityLogs({ page, limit });

  const getActionColor = (action: string) => {
    switch(action.toLowerCase()) {
      case 'create':
      case 'created':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'update':
      case 'updated':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'delete':
      case 'deleted':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'export':
      case 'exported':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground flex items-center gap-3">
          <ActivitySquare className="w-8 h-8 text-primary" />
          System Activity
        </h1>
        <p className="text-muted-foreground mt-1">Audit log of all changes made to the catalog.</p>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead className="w-1/2">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                      Loading logs...
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-destructive">
                      Failed to load activity logs. Please refresh and try again.
                    </TableCell>
                  </TableRow>
                ) : data?.logs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      No activity logs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.logs?.map((log) => (
                    <TableRow key={log.id} className="font-mono text-sm">
                      <TableCell className="text-muted-foreground">
                        {log.createdAt
                          ? format(new Date(log.createdAt), "MMM dd, HH:mm:ss")
                          : "N/A"}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{log.user}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`capitalize ${getActionColor(log.action)}`}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize text-muted-foreground">
                        {log.entityType.replace('_', ' ')} {log.entityId ? `#${log.entityId}` : ''}
                      </TableCell>
                      <TableCell className="truncate max-w-xs" title={log.details}>
                        {log.details}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {data && Math.ceil(data.total / limit) > 1 && (
            <div className="p-4 border-t border-border/50 flex justify-between items-center bg-muted/20">
              <Button 
                variant="outline" 
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-sm font-medium">Page {page} of {Math.ceil(data.total / limit)}</span>
              <Button 
                variant="outline" 
                disabled={page === Math.ceil(data.total / limit)}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}
