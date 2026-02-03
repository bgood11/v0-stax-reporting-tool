"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DataRow {
  id: string;
  lender: string;
  retailer: string;
  status: string;
  loanValue: number;
  commission: number;
  date: string;
  bdm: string;
  children?: DataRow[];
}

interface DataTableProps {
  data: DataRow[];
  isGrouped?: boolean;
}

type SortDirection = "asc" | "desc" | null;
type SortField = keyof DataRow;

export function DataTable({ data, isGrouped = false }: DataTableProps) {
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(
    new Set()
  );
  const [sortField, setSortField] = React.useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = React.useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 10;

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortField || !sortDirection) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortDirection === "asc"
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });
  }, [data, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-4 w-4 text-primary" />
    ) : (
      <ArrowDown className="h-4 w-4 text-primary" />
    );
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      Approved: "bg-green-100 text-green-700",
      Declined: "bg-red-100 text-red-700",
      Pending: "bg-yellow-100 text-yellow-700",
      Settled: "bg-blue-100 text-blue-700",
      Submitted: "bg-gray-100 text-gray-700",
    };
    return (
      <span
        className={cn(
          "px-2 py-1 rounded-full text-xs font-medium",
          colors[status] || "bg-gray-100 text-gray-700"
        )}
      >
        {status}
      </span>
    );
  };

  const renderRow = (row: DataRow, depth = 0) => {
    const hasChildren = row.children && row.children.length > 0;
    const isExpanded = expandedRows.has(row.id);

    return (
      <React.Fragment key={row.id}>
        <TableRow
          className={cn(
            depth > 0 && "bg-muted/30",
            hasChildren && "cursor-pointer hover:bg-muted/50"
          )}
          onClick={() => hasChildren && toggleRow(row.id)}
        >
          <TableCell>
            <div
              className="flex items-center gap-2"
              style={{ paddingLeft: `${depth * 24}px` }}
            >
              {hasChildren && (
                <span className="text-muted-foreground">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </span>
              )}
              <span className="font-medium text-foreground">{row.lender}</span>
            </div>
          </TableCell>
          <TableCell className="text-muted-foreground">{row.retailer}</TableCell>
          <TableCell>
            <StatusBadge status={row.status} />
          </TableCell>
          <TableCell className="text-right font-medium text-foreground">
            {formatCurrency(row.loanValue)}
          </TableCell>
          <TableCell className="text-right text-muted-foreground">
            {formatCurrency(row.commission)}
          </TableCell>
          <TableCell className="text-muted-foreground">{row.date}</TableCell>
          <TableCell className="text-muted-foreground">{row.bdm}</TableCell>
        </TableRow>
        {hasChildren &&
          isExpanded &&
          row.children?.map((child) => renderRow(child, depth + 1))}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>
                <button
                  type="button"
                  className="flex items-center gap-2 hover:text-foreground transition-colors"
                  onClick={() => handleSort("lender")}
                >
                  Lender
                  <SortIcon field="lender" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  className="flex items-center gap-2 hover:text-foreground transition-colors"
                  onClick={() => handleSort("retailer")}
                >
                  Retailer
                  <SortIcon field="retailer" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  className="flex items-center gap-2 hover:text-foreground transition-colors"
                  onClick={() => handleSort("status")}
                >
                  Status
                  <SortIcon field="status" />
                </button>
              </TableHead>
              <TableHead className="text-right">
                <button
                  type="button"
                  className="flex items-center gap-2 ml-auto hover:text-foreground transition-colors"
                  onClick={() => handleSort("loanValue")}
                >
                  Loan Value
                  <SortIcon field="loanValue" />
                </button>
              </TableHead>
              <TableHead className="text-right">
                <button
                  type="button"
                  className="flex items-center gap-2 ml-auto hover:text-foreground transition-colors"
                  onClick={() => handleSort("commission")}
                >
                  Commission
                  <SortIcon field="commission" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  className="flex items-center gap-2 hover:text-foreground transition-colors"
                  onClick={() => handleSort("date")}
                >
                  Date
                  <SortIcon field="date" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  className="flex items-center gap-2 hover:text-foreground transition-colors"
                  onClick={() => handleSort("bdm")}
                >
                  BDM
                  <SortIcon field="bdm" />
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((row) => renderRow(row))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-transparent"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-transparent"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-transparent"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-transparent"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
