"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, FileBarChart, RefreshCw } from "lucide-react";

interface Report {
  id: string;
  name: string;
  record_count: number;
  result_summary: {
    totalRecords: number;
    totalLoanValue: number;
    totalCommission: number;
  };
  created_at: string;
}

export default function HistoryPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/reports/history')
      .then(res => res.json())
      .then(data => {
        if (data.reports) {
          setReports(data.reports);
        }
      })
      .catch(err => console.error('Failed to load history:', err))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `£${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `£${(value / 1000).toFixed(0)}K`;
    }
    return `£${value.toFixed(0)}`;
  };

  return (
    <AppLayout pageTitle="Report History">
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Report History
          </h2>
          <p className="text-muted-foreground">
            View your previously generated reports
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : reports.length === 0 ? (
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <FileBarChart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No reports generated yet. Go to the Report Builder to create your first report.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {reports.map((report) => (
              <Card key={report.id} className="bg-card">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-medium text-foreground">
                      {report.name}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {formatDate(report.created_at)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Records: </span>
                      <span className="font-medium text-foreground">
                        {report.record_count?.toLocaleString() || 0}
                      </span>
                    </div>
                    {report.result_summary && (
                      <>
                        <div>
                          <span className="text-muted-foreground">Loan Value: </span>
                          <span className="font-medium text-foreground">
                            {formatCurrency(report.result_summary.totalLoanValue || 0)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Commission: </span>
                          <span className="font-medium text-foreground">
                            {formatCurrency(report.result_summary.totalCommission || 0)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
