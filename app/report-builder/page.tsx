"use client";

import * as React from "react";
import { AppLayout } from "@/components/app-layout";
import {
  ReportTypeToggle,
  type ReportType,
} from "@/components/report-builder/report-type-toggle";
import {
  FiltersSection,
  type FilterValues,
} from "@/components/report-builder/filters-section";
import {
  GroupingSection,
  type GroupingOption,
} from "@/components/report-builder/grouping-section";
import { MetricsSection } from "@/components/report-builder/metrics-section";
import { ActionBar } from "@/components/report-builder/action-bar";
import { SummaryCards, type SummaryData } from "@/components/report-results/summary-cards";
import { ResultsHeader, type ViewMode } from "@/components/report-results/results-header";
import { DataTable, type DataRow } from "@/components/report-results/data-table";
import { LoadingSkeleton } from "@/components/report-results/loading-skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

// Sample data for demonstration
const sampleData: DataRow[] = [
  { id: "1", lender: "Pepper Money", retailer: "Harvey Norman", status: "Approved", loanValue: 45000, commission: 1350, date: "2026-01-15", bdm: "John Smith" },
  { id: "2", lender: "Liberty", retailer: "JB Hi-Fi", status: "Settled", loanValue: 32000, commission: 960, date: "2026-01-14", bdm: "Sarah Johnson" },
  { id: "3", lender: "Latitude", retailer: "The Good Guys", status: "Pending", loanValue: 28500, commission: 855, date: "2026-01-13", bdm: "Michael Brown" },
  { id: "4", lender: "Westpac", retailer: "Officeworks", status: "Approved", loanValue: 55000, commission: 1650, date: "2026-01-12", bdm: "Emily Davis" },
  { id: "5", lender: "ANZ", retailer: "Harvey Norman", status: "Declined", loanValue: 0, commission: 0, date: "2026-01-11", bdm: "John Smith" },
  { id: "6", lender: "Pepper Money", retailer: "JB Hi-Fi", status: "Approved", loanValue: 38000, commission: 1140, date: "2026-01-10", bdm: "Sarah Johnson" },
  { id: "7", lender: "NAB", retailer: "The Good Guys", status: "Settled", loanValue: 67000, commission: 2010, date: "2026-01-09", bdm: "Michael Brown" },
  { id: "8", lender: "CBA", retailer: "Officeworks", status: "Pending", loanValue: 42000, commission: 1260, date: "2026-01-08", bdm: "Emily Davis" },
  { id: "9", lender: "Liberty", retailer: "Harvey Norman", status: "Approved", loanValue: 51000, commission: 1530, date: "2026-01-07", bdm: "John Smith" },
  { id: "10", lender: "Latitude", retailer: "JB Hi-Fi", status: "Settled", loanValue: 29500, commission: 885, date: "2026-01-06", bdm: "Sarah Johnson" },
  { id: "11", lender: "Pepper Money", retailer: "The Good Guys", status: "Approved", loanValue: 63000, commission: 1890, date: "2026-01-05", bdm: "Michael Brown" },
  { id: "12", lender: "Westpac", retailer: "Harvey Norman", status: "Pending", loanValue: 47500, commission: 1425, date: "2026-01-04", bdm: "Emily Davis" },
];

const sampleSummary: SummaryData = {
  totalRecords: 12,
  totalLoanValue: 498500,
  totalCommission: 14955,
  approvalRate: 78,
};

export default function ReportBuilderPage() {
  const [reportType, setReportType] = React.useState<ReportType>("ap");
  const [filters, setFilters] = React.useState<FilterValues>({
    dateRange: "last30days",
    lender: [],
    status: [],
    retailer: [],
    bdm: [],
    financeProduct: [],
    primeSubPrime: "all",
  });
  const [grouping, setGrouping] = React.useState<GroupingOption[]>([]);
  const [metrics, setMetrics] = React.useState<string[]>([
    "totalApplications",
    "loanValue",
    "approvalRate",
  ]);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [showResults, setShowResults] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<ViewMode>("table");

  const handleGenerate = async () => {
    setIsGenerating(true);
    setShowResults(true);
    // Simulate report generation
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsGenerating(false);
  };

  const handleSavePreset = () => {
    alert("Preset saved!");
  };

  const handleSchedule = () => {
    alert("Schedule dialog would open here");
  };

  const handleExport = (format: "csv" | "xlsx" | "pdf") => {
    alert(`Exporting as ${format.toUpperCase()}`);
  };

  const handleShare = () => {
    alert("Share dialog would open here");
  };

  const handleBackToBuilder = () => {
    setShowResults(false);
  };

  const canGenerate = metrics.length > 0;

  if (showResults) {
    return (
      <AppLayout pageTitle="Report Results">
        <div className="p-4 md:p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleBackToBuilder}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Builder
            </Button>
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Report Results
              </h2>
              <p className="text-muted-foreground">
                {reportType === "ap" ? "AP" : "AD"} Report - Last 30 Days
              </p>
            </div>
          </div>

          {isGenerating ? (
            <LoadingSkeleton />
          ) : (
            <>
              <SummaryCards data={sampleSummary} />
              <ResultsHeader
                recordCount={sampleData.length}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onExport={handleExport}
                onShare={handleShare}
              />
              <DataTable data={sampleData} />
            </>
          )}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Report Builder">
      <div className="flex flex-col min-h-[calc(100vh-4rem)]">
        <div className="flex-1 p-4 md:p-6 space-y-6 pb-24">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Build Your Report
              </h2>
              <p className="text-muted-foreground">
                Configure filters, grouping, and metrics to generate your custom
                report
              </p>
            </div>
            <ReportTypeToggle value={reportType} onChange={setReportType} />
          </div>

          <FiltersSection filters={filters} onChange={setFilters} />

          <div className="grid gap-6 lg:grid-cols-2">
            <GroupingSection selected={grouping} onChange={setGrouping} />
            <MetricsSection selected={metrics} onChange={setMetrics} />
          </div>
        </div>

        <ActionBar
          onGenerate={handleGenerate}
          onSavePreset={handleSavePreset}
          onSchedule={handleSchedule}
          isGenerating={isGenerating}
          canGenerate={canGenerate}
        />
      </div>
    </AppLayout>
  );
}
