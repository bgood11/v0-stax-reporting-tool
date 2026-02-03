"use client";

import * as React from "react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
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
import {
  Download,
  Search,
  Calendar,
  LogIn,
  LogOut,
  FileText,
  Settings,
  UserPlus,
  UserMinus,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ActionType = "login" | "logout" | "report_generated" | "report_exported" | "preset_created" | "schedule_created" | "user_invited" | "user_deactivated" | "settings_changed";

interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: ActionType;
  details: string;
  ipAddress: string;
}

const actionConfig: Record<ActionType, { label: string; icon: React.ElementType; color: string }> = {
  login: { label: "Login", icon: LogIn, color: "bg-green-100 text-green-700" },
  logout: { label: "Logout", icon: LogOut, color: "bg-gray-100 text-gray-700" },
  report_generated: { label: "Report Generated", icon: FileText, color: "bg-blue-100 text-blue-700" },
  report_exported: { label: "Report Exported", icon: Download, color: "bg-blue-100 text-blue-700" },
  preset_created: { label: "Preset Created", icon: FileText, color: "bg-purple-100 text-purple-700" },
  schedule_created: { label: "Schedule Created", icon: Clock, color: "bg-orange-100 text-orange-700" },
  user_invited: { label: "User Invited", icon: UserPlus, color: "bg-teal-100 text-teal-700" },
  user_deactivated: { label: "User Deactivated", icon: UserMinus, color: "bg-red-100 text-red-700" },
  settings_changed: { label: "Settings Changed", icon: Settings, color: "bg-yellow-100 text-yellow-700" },
};

const sampleLogs: AuditLogEntry[] = [
  { id: "1", timestamp: "2026-02-03 14:32:15", user: "Jane Doe", action: "report_generated", details: "Generated 'Monthly Approval Rate' report", ipAddress: "203.45.67.89" },
  { id: "2", timestamp: "2026-02-03 14:30:42", user: "Jane Doe", action: "login", details: "Logged in via magic link", ipAddress: "203.45.67.89" },
  { id: "3", timestamp: "2026-02-03 11:45:18", user: "John Smith", action: "report_exported", details: "Exported report as XLSX", ipAddress: "203.45.67.90" },
  { id: "4", timestamp: "2026-02-03 11:42:30", user: "John Smith", action: "login", details: "Logged in via magic link", ipAddress: "203.45.67.90" },
  { id: "5", timestamp: "2026-02-03 09:15:22", user: "Michael Brown", action: "preset_created", details: "Created preset 'Q1 Lender Summary'", ipAddress: "203.45.67.91" },
  { id: "6", timestamp: "2026-02-02 16:20:45", user: "Sarah Johnson", action: "schedule_created", details: "Created schedule 'Weekly BDM Report'", ipAddress: "203.45.67.92" },
  { id: "7", timestamp: "2026-02-02 15:10:33", user: "Jane Doe", action: "user_invited", details: "Invited tom.anderson@shermin.com.au", ipAddress: "203.45.67.89" },
  { id: "8", timestamp: "2026-02-02 14:05:18", user: "David Wilson", action: "settings_changed", details: "Updated email notification settings", ipAddress: "203.45.67.93" },
  { id: "9", timestamp: "2026-02-02 11:30:55", user: "Jane Doe", action: "user_deactivated", details: "Deactivated lisa.chen@shermin.com.au", ipAddress: "203.45.67.89" },
  { id: "10", timestamp: "2026-02-02 10:45:12", user: "Emily Davis", action: "login", details: "Logged in via magic link", ipAddress: "203.45.67.94" },
  { id: "11", timestamp: "2026-02-01 16:55:30", user: "John Smith", action: "logout", details: "Session ended", ipAddress: "203.45.67.90" },
  { id: "12", timestamp: "2026-02-01 09:20:18", user: "Sarah Johnson", action: "report_generated", details: "Generated 'BDM Performance' report", ipAddress: "203.45.67.92" },
];

const userOptions = ["All Users", "Jane Doe", "John Smith", "Sarah Johnson", "Michael Brown", "Emily Davis", "David Wilson"];
const actionOptions: { value: ActionType | "all"; label: string }[] = [
  { value: "all", label: "All Actions" },
  { value: "login", label: "Login" },
  { value: "logout", label: "Logout" },
  { value: "report_generated", label: "Report Generated" },
  { value: "report_exported", label: "Report Exported" },
  { value: "preset_created", label: "Preset Created" },
  { value: "schedule_created", label: "Schedule Created" },
  { value: "user_invited", label: "User Invited" },
  { value: "user_deactivated", label: "User Deactivated" },
  { value: "settings_changed", label: "Settings Changed" },
];

export default function AuditLogPage() {
  const [logs] = React.useState(sampleLogs);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [userFilter, setUserFilter] = React.useState("All Users");
  const [actionFilter, setActionFilter] = React.useState<ActionType | "all">("all");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  
  const itemsPerPage = 10;

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesUser = userFilter === "All Users" || log.user === userFilter;
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    
    let matchesDate = true;
    if (dateFrom) {
      matchesDate = matchesDate && log.timestamp >= dateFrom;
    }
    if (dateTo) {
      matchesDate = matchesDate && log.timestamp <= dateTo + " 23:59:59";
    }
    
    return matchesSearch && matchesUser && matchesAction && matchesDate;
  });

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExport = () => {
    alert("Exporting audit log as CSV...");
  };

  const getActionBadge = (action: ActionType) => {
    const config = actionConfig[action];
    const Icon = config.icon;
    return (
      <Badge variant="secondary" className={cn("gap-1.5", config.color)}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <AppLayout pageTitle="Audit Log">
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Audit Log</h2>
            <p className="text-muted-foreground">
              Track all system activity and user actions
            </p>
          </div>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select
              value={userFilter}
              onValueChange={(value) => {
                setUserFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by user" />
              </SelectTrigger>
              <SelectContent>
                {userOptions.map((user) => (
                  <SelectItem key={user} value={user}>
                    {user}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={actionFilter}
              onValueChange={(value: ActionType | "all") => {
                setActionFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                {actionOptions.map((action) => (
                  <SelectItem key={action.value} value={action.value}>
                    {action.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
                placeholder="From date"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
                placeholder="To date"
              />
            </div>
          </div>
        </Card>

        {/* Logs Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="hidden md:table-cell">Details</TableHead>
                <TableHead className="hidden lg:table-cell">IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-sm whitespace-nowrap">
                    {log.timestamp}
                  </TableCell>
                  <TableCell className="font-medium">{log.user}</TableCell>
                  <TableCell>{getActionBadge(log.action)}</TableCell>
                  <TableCell className="hidden md:table-cell max-w-[300px] truncate">
                    {log.details}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell font-mono text-sm text-muted-foreground">
                    {log.ipAddress}
                  </TableCell>
                </TableRow>
              ))}
              {paginatedLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h3 className="font-semibold text-foreground mb-1">No logs found</h3>
                      <p className="text-sm text-muted-foreground">
                        Try adjusting your filters
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
        </Card>
      </div>
    </AppLayout>
  );
}
