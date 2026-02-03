"use client";

import { cn } from "@/lib/utils";

export type ReportType = "ap" | "ad";

interface ReportTypeToggleProps {
  value: ReportType;
  onChange: (value: ReportType) => void;
}

export function ReportTypeToggle({ value, onChange }: ReportTypeToggleProps) {
  return (
    <div className="flex items-center gap-2 p-1 bg-muted rounded-xl">
      <button
        type="button"
        onClick={() => onChange("ap")}
        className={cn(
          "px-6 py-3 rounded-lg text-sm font-medium transition-all",
          value === "ap"
            ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        AP Reports
      </button>
      <button
        type="button"
        onClick={() => onChange("ad")}
        className={cn(
          "px-6 py-3 rounded-lg text-sm font-medium transition-all",
          value === "ad"
            ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        AD Reports
      </button>
    </div>
  );
}
