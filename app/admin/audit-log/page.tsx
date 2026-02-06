"use client";

import * as React from "react";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Search,
  FileText,
  Users,
  Settings,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Activity,
  LogIn,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ActionType = "report" | "user" | "sync" | "login" | "settings";

interface AuditLogEntry {
  id: string;
  action: string;
  action_type: ActionType;
  user_email: string;
  user_name: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export default function AuditLogPage() {
  const [logs, setLogs] = React.useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [actionFilter, setActionFilter] = React.useState<ActionType | "all">("all");
  const [currentPage, setCurrentPage] = React.useState(1);

  const itemsPerPage = 15;

  React.useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/admin/audit-log');
      const data = await res.json();
      if (data.logs) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesFilter = actionFilter === "all" || log.action_type === actionFilter;
    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getActionIcon = (type: ActionType) => {
    switch (type) {
      case "report":
        return <FileText className="h-4 w-4" />;
      case "user":
        return <Users className="h-4 w-4" />;
      case "sync":
        return <RefreshCw className="h-4 w-4" />;
      case "login":
        return <LogIn className="h-4 w-4" />;
      case "settings":
        return <Settings className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActionBadgeStyle = (type: ActionType) => {
    switch (type) {
      case "report":
        return "bg-blue-100 text-blue-700";
      case "user":
        return "bg-purple-100 text-purple-700";
      case "sync":
        return "bg-green-100 text-green-700";
      case "login":
        return "bg-amber-100 text-amber-700";
      case "settings":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AppLayout pageTitle="Audit Log">
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">Audit Log</h2>
          <p className="text-muted-foreground">
            Track all system activity and user actions
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search actions or users..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>
          <Select
            value={actionFilter}
            onValueChange={(value: ActionType | "all") => {
              setActionFilter(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="report">Reports</SelectItem>
              <SelectItem value="user">User Management</SelectItem>
              <SelectItem value="sync">Data Sync</SelectItem>
              <SelectItem value="login">Logins</SelectItem>
              <SelectItem value="settings">Settings</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Audit Log Table */}
        <Card>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead className="hidden md:table-cell">Details</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "h-8 w-8 rounded-full flex items-center justify-center",
                              getActionBadgeStyle(log.action_type)
                            )}
                          >
                            {getActionIcon(log.action_type)}
                          </div>
                          <div>
                            <p className="font-medium">{log.action}</p>
                            <Badge
                              variant="secondary"
                              className={cn("text-xs", getActionBadgeStyle(log.action_type))}
                            >
                              {log.action_type}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{log.user_name || 'System'}</p>
                          <p className="text-sm text-muted-foreground">{log.user_email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-xs truncate">
                        {log.details ? JSON.stringify(log.details) : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(log.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {paginatedLogs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                            <Activity className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <h3 className="font-semibold text-foreground mb-1">No audit logs found</h3>
                          <p className="text-sm text-muted-foreground">
                            {logs.length === 0
                              ? "No activity has been recorded yet."
                              : "Try adjusting your search or filters"}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                    {Math.min(currentPage * itemsPerPage, filteredLogs.length)} of{" "}
                    {filteredLogs.length} entries
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
