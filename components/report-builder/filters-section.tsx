"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, CalendarIcon, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface FilterValues {
  dateRange: string;
  lender: string[];
  status: string[];
  retailer: string[];
  bdm: string[];
  financeProduct: string[];
  primeSubPrime: string;
}

interface FiltersSectionProps {
  filters: FilterValues;
  onChange: (filters: FilterValues) => void;
}

const lenderOptions = [
  "Pepper Money",
  "Liberty",
  "Latitude",
  "Westpac",
  "ANZ",
  "NAB",
  "CBA",
];
const statusOptions = [
  "Submitted",
  "Approved",
  "Declined",
  "Settled",
  "Pending",
];
const retailerOptions = [
  "Harvey Norman",
  "JB Hi-Fi",
  "The Good Guys",
  "Officeworks",
];
const bdmOptions = ["John Smith", "Sarah Johnson", "Michael Brown", "Emily Davis"];
const financeProductOptions = [
  "Personal Loan",
  "Car Loan",
  "Home Loan",
  "Credit Card",
];
const dateRangeOptions = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7days", label: "Last 7 Days" },
  { value: "last30days", label: "Last 30 Days" },
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "thisQuarter", label: "This Quarter" },
  { value: "lastQuarter", label: "Last Quarter" },
  { value: "thisYear", label: "This Year" },
  { value: "custom", label: "Custom Range" },
];

function MultiSelect({
  label,
  options,
  selected,
  onSelect,
  placeholder,
}: {
  label: string;
  options: string[];
  selected: string[];
  onSelect: (values: string[]) => void;
  placeholder: string;
}) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleToggle = (option: string) => {
    if (selected.includes(option)) {
      onSelect(selected.filter((item) => item !== option));
    } else {
      onSelect([...selected, option]);
    }
  };

  const handleRemove = (option: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(selected.filter((item) => item !== option));
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex min-h-10 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm",
            "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          )}
        >
          <div className="flex flex-wrap gap-1 flex-1">
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              selected.map((item) => (
                <Badge
                  key={item}
                  variant="secondary"
                  className="bg-primary/10 text-primary hover:bg-primary/20"
                >
                  {item}
                  <button
                    type="button"
                    onClick={(e) => handleRemove(item, e)}
                    className="ml-1 hover:text-primary"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            )}
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-popover p-1 shadow-lg">
            <div className="max-h-48 overflow-y-auto">
              {options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleToggle(option)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                    selected.includes(option)
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted text-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "h-4 w-4 rounded border flex items-center justify-center",
                      selected.includes(option)
                        ? "bg-primary border-primary"
                        : "border-input"
                    )}
                  >
                    {selected.includes(option) && (
                      <svg
                        className="h-3 w-3 text-primary-foreground"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function FiltersSection({ filters, onChange }: FiltersSectionProps) {
  const [isOpen, setIsOpen] = React.useState(true);

  const updateFilter = <K extends keyof FilterValues>(
    key: K,
    value: FilterValues[K]
  ) => {
    onChange({ ...filters, [key]: value });
  };

  const activeFilterCount = [
    filters.lender.length > 0,
    filters.status.length > 0,
    filters.retailer.length > 0,
    filters.bdm.length > 0,
    filters.financeProduct.length > 0,
    filters.primeSubPrime !== "all",
  ].filter(Boolean).length;

  return (
    <Card className="bg-card">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-xl">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <CardTitle className="text-foreground">Filters</CardTitle>
                {activeFilterCount > 0 && (
                  <Badge className="bg-primary/10 text-primary border-0">
                    {activeFilterCount} active
                  </Badge>
                )}
              </div>
              {isOpen ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Date Range
              </label>
              <Select
                value={filters.dateRange}
                onValueChange={(value) => updateFilter("dateRange", value)}
              >
                <SelectTrigger className="w-full rounded-xl">
                  <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  {dateRangeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <MultiSelect
              label="Lender"
              options={lenderOptions}
              selected={filters.lender}
              onSelect={(values) => updateFilter("lender", values)}
              placeholder="Select lenders"
            />

            <MultiSelect
              label="Status"
              options={statusOptions}
              selected={filters.status}
              onSelect={(values) => updateFilter("status", values)}
              placeholder="Select status"
            />

            <MultiSelect
              label="Retailer"
              options={retailerOptions}
              selected={filters.retailer}
              onSelect={(values) => updateFilter("retailer", values)}
              placeholder="Select retailers"
            />

            <MultiSelect
              label="BDM"
              options={bdmOptions}
              selected={filters.bdm}
              onSelect={(values) => updateFilter("bdm", values)}
              placeholder="Select BDM"
            />

            <MultiSelect
              label="Finance Product"
              options={financeProductOptions}
              selected={filters.financeProduct}
              onSelect={(values) => updateFilter("financeProduct", values)}
              placeholder="Select products"
            />

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Prime / Sub-Prime
              </label>
              <Select
                value={filters.primeSubPrime}
                onValueChange={(value) => updateFilter("primeSubPrime", value)}
              >
                <SelectTrigger className="w-full rounded-xl">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="prime">Prime Only</SelectItem>
                  <SelectItem value="subprime">Sub-Prime Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
              <Button
                variant="outline"
                onClick={() =>
                  onChange({
                    dateRange: "last30days",
                    lender: [],
                    status: [],
                    retailer: [],
                    bdm: [],
                    financeProduct: [],
                    primeSubPrime: "all",
                  })
                }
                className="text-muted-foreground"
              >
                Clear All Filters
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
