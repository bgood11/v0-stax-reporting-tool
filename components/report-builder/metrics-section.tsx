"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface MetricOption {
  id: string;
  label: string;
  category: "volume" | "value" | "rate";
}

const metricOptions: MetricOption[] = [
  { id: "totalApplications", label: "Total Applications", category: "volume" },
  { id: "approvedCount", label: "Approved Count", category: "volume" },
  { id: "declinedCount", label: "Declined Count", category: "volume" },
  { id: "settledCount", label: "Settled Count", category: "volume" },
  { id: "pendingCount", label: "Pending Count", category: "volume" },
  { id: "loanValue", label: "Total Loan Value", category: "value" },
  { id: "avgLoanSize", label: "Average Loan Size", category: "value" },
  { id: "totalCommission", label: "Total Commission", category: "value" },
  { id: "avgCommission", label: "Average Commission", category: "value" },
  { id: "approvalRate", label: "Approval Rate", category: "rate" },
  { id: "settlementRate", label: "Settlement Rate", category: "rate" },
  { id: "conversionRate", label: "Conversion Rate", category: "rate" },
];

interface MetricsSectionProps {
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function MetricsSection({ selected, onChange }: MetricsSectionProps) {
  const handleToggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((item) => item !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const selectAll = () => {
    onChange(metricOptions.map((m) => m.id));
  };

  const clearAll = () => {
    onChange([]);
  };

  const volumeMetrics = metricOptions.filter((m) => m.category === "volume");
  const valueMetrics = metricOptions.filter((m) => m.category === "value");
  const rateMetrics = metricOptions.filter((m) => m.category === "rate");

  const MetricGroup = ({
    title,
    metrics,
  }: {
    title: string;
    metrics: MetricOption[];
  }) => (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
      <div className="grid gap-2 sm:grid-cols-2">
        {metrics.map((metric) => (
          <label
            key={metric.id}
            htmlFor={metric.id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors",
              selected.includes(metric.id)
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/50"
            )}
          >
            <Checkbox
              id={metric.id}
              checked={selected.includes(metric.id)}
              onCheckedChange={() => handleToggle(metric.id)}
            />
            <span
              className={cn(
                "text-sm",
                selected.includes(metric.id)
                  ? "text-foreground font-medium"
                  : "text-muted-foreground"
              )}
            >
              {metric.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <Card className="bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-foreground">Metrics</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Select the data points to include in your report
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="text-sm text-primary hover:underline"
            >
              Select All
            </button>
            <span className="text-muted-foreground">|</span>
            <button
              type="button"
              onClick={clearAll}
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              Clear
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <MetricGroup title="Volume Metrics" metrics={volumeMetrics} />
        <MetricGroup title="Value Metrics" metrics={valueMetrics} />
        <MetricGroup title="Rate Metrics" metrics={rateMetrics} />
      </CardContent>
    </Card>
  );
}
