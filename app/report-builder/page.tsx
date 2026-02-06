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
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// Map date range presets to actual date values
function getDateRange(preset: string): { dateFrom?: string; dateTo?: string } {
  const today = new Date();
  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  switch (preset) {
    case "today":
      return { dateFrom: formatDate(today), dateTo: formatDate(today) };
    case "last7days":
      const week = new Date(today);
      week.setDate(week.getDate() - 7);
      return { dateFrom: formatDate(week), dateTo: formatDate(today) };
    case "last30days":
      const month = new Date(today);
      month.setDate(month.getDate() - 30);
      return { dateFrom: formatDate(month), dateTo: formatDate(today) };
    case "last90days":
      const quarter = new Date(today);
      quarter.setDate(quarter.getDate() - 90);
      return { dateFrom: formatDate(quarter), dateTo: formatDate(today) };
    case "thisMonth":
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      return { dateFrom: formatDate(monthStart), dateTo: formatDate(today) };
    case "lastMonth":
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      return { dateFrom: formatDate(lastMonthStart), dateTo: formatDate(lastMonthEnd) };
    case "thisYear":
      const yearStart = new Date(today.getFullYear(), 0, 1);
      return { dateFrom: formatDate(yearStart), dateTo: formatDate(today) };
    default:
      return {};
  }
}

export default function ReportBuilderPage() {
  const [reportType, setReportType] = React.useState<ReportType>("ad");
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
  const [reportData, setReportData] = React.useState<DataRow[]>([]);
  const [summary, setSummary] = React.useState<SummaryData | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setShowResults(true);
    setError(null);

    try {
      const dateRange = getDateRange(filters.dateRange);

      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${reportType.toUpperCase()} Report`,
          reportType: reportType.toUpperCase(),
          groupBy: grouping.map(g => g.value),
          metrics: metrics,
          dateFrom: dateRange.dateFrom,
          dateTo: dateRange.dateTo,
          lenders: filters.lender.length > 0 ? filters.lender : undefined,
          retailers: filters.retailer.length > 0 ? filters.retailer : undefined,
          statuses: filters.status.length > 0 ? filters.status : undefined,
          bdms: filters.bdm.length > 0 ? filters.bdm : undefined,
          financeProducts: filters.financeProduct.length > 0 ? filters.financeProduct : undefined,
          primeSubprime: filters.primeSubPrime !== 'all' ? [filters.primeSubPrime] : undefined,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setReportData([]);
        setSummary(null);
      } else {
        // Transform API data to DataRow format
        const rows: DataRow[] = (data.data || []).map((row: any, index: number) => ({
          id: String(index + 1),
          lender: row.lender_name || row.lender || '-',
          retailer: row.retailer_name || row.retailer || '-',
          status: row.status || '-',
          loanValue: row.loan_value || row.loan_amount || 0,
          commission: row.commission || row.commission_amount || 0,
          date: row.submitted_date || row.date || '-',
          bdm: row.bdm_name || row.bdm || '-',
          // Include any grouped fields
          ...row,
        }));

        setReportData(rows);
        setSummary({
          totalRecords: data.summary?.totalRecords || rows.length,
          totalLoanValue: data.summary?.totalLoanValue || 0,
          totalCommission: data.summary?.totalCommission || 0,
          approvalRate: Math.round(data.summary?.approvalRate || 0),
        });
      }
    } catch (err: any) {
      console.error('Report generation failed:', err);
      setError(err.message || 'Failed to generate report');
      setReportData([]);
      setSummary(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSavePreset = () => {
    // TODO: Implement preset saving
    alert("Preset saving coming soon!");
  };

  const handleSchedule = () => {
    // TODO: Implement scheduling
    alert("Report scheduling coming soon!");
  };

  const handleExport = async (format: "csv" | "xlsx" | "pdf") => {
    try {
      const dateRange = getDateRange(filters.dateRange);

      const response = await fetch('/api/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          reportType: reportType.toUpperCase(),
          groupBy: grouping.map(g => g.value),
          metrics: metrics,
          dateFrom: dateRange.dateFrom,
          dateTo: dateRange.dateTo,
          lenders: filters.lender.length > 0 ? filters.lender : undefined,
          retailers: filters.retailer.length > 0 ? filters.retailer : undefined,
          statuses: filters.status.length > 0 ? filters.status : undefined,
          bdms: filters.bdm.length > 0 ? filters.bdm : undefined,
          financeProducts: filters.financeProduct.length > 0 ? filters.financeProduct : undefined,
          primeSubprime: filters.primeSubPrime !== 'all' ? [filters.primeSubPrime] : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Export failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      if (format === 'csv') {
        a.download = `stax-report-${new Date().toISOString().split('T')[0]}.csv`;
      } else if (format === 'xlsx') {
        a.download = `stax-report-${new Date().toISOString().split('T')[0]}.xlsx`;
      } else {
        a.download = `stax-report-${new Date().toISOString().split('T')[0]}.${format}`;
      }

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Please try again.');
    }
  };

  const handleShare = () => {
    // TODO: Implement sharing
    alert("Report sharing coming soon!");
  };

  const handleBackToBuilder = () => {
    setShowResults(false);
    setError(null);
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
                {reportType.toUpperCase()} Report - {filters.dateRange}
              </p>
            </div>
          </div>

          {isGenerating ? (
            <LoadingSkeleton />
          ) : error ? (
            <Card className="bg-destructive/10 border-destructive">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <p className="text-destructive">{error}</p>
                </div>
              </CardContent>
            </Card>
          ) : reportData.length === 0 ? (
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No data found for the selected filters. Try adjusting your date range or filter criteria.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {summary && <SummaryCards data={summary} />}
              <ResultsHeader
                recordCount={reportData.length}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onExport={handleExport}
                onShare={handleShare}
              />
              <DataTable data={reportData} />
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
