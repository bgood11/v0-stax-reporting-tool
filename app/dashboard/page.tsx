"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileBarChart, TrendingUp, DollarSign, Clock, RefreshCw, AlertCircle } from "lucide-react";
import Link from "next/link";

interface DashboardStats {
  totalApplications: number;
  totalLoanValue: number;
  totalCommission: number;
  statusBreakdown: Record<string, number>;
  lastSync: {
    started_at: string;
    completed_at: string;
    status: string;
    records_synced: number;
  } | null;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    // Fetch dashboard stats
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setStats(data);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));

    // Fetch user info
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user?.name) {
          setUserName(data.user.name);
        }
      })
      .catch(() => {});
  }, []);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `£${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `£${(value / 1000).toFixed(0)}K`;
    }
    return `£${value.toFixed(0)}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate approval rate from status breakdown
  const calculateApprovalRate = () => {
    if (!stats?.statusBreakdown) return 0;
    const approved = (stats.statusBreakdown['Approved'] || 0) +
                     (stats.statusBreakdown['Executed'] || 0) +
                     (stats.statusBreakdown['Live'] || 0);
    const declined = stats.statusBreakdown['Declined'] || 0;
    const total = approved + declined;
    return total > 0 ? Math.round((approved / total) * 100) : 0;
  };

  const statCards = stats ? [
    {
      title: "Total Applications",
      value: stats.totalApplications.toLocaleString(),
      icon: FileBarChart,
    },
    {
      title: "Total Loan Value",
      value: formatCurrency(stats.totalLoanValue),
      icon: DollarSign,
    },
    {
      title: "Total Commission",
      value: formatCurrency(stats.totalCommission),
      icon: TrendingUp,
    },
    {
      title: "Approval Rate",
      value: `${calculateApprovalRate()}%`,
      icon: TrendingUp,
    },
  ] : [];

  return (
    <AppLayout pageTitle="Dashboard">
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Welcome back{userName ? `, ${userName}` : ''}
            </h2>
            <p className="text-muted-foreground">
              Here&apos;s an overview of your Salesforce data
            </p>
          </div>
          <Button asChild className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
            <Link href="/report-builder">
              <FileBarChart className="h-4 w-4 mr-2" />
              New Report
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <Card className="bg-destructive/10 border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <p className="text-destructive">{error}</p>
              </div>
            </CardContent>
          </Card>
        ) : stats ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {statCards.map((stat) => (
                <Card key={stat.title} className="bg-card">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">
                      {stat.value}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Last Sync Info */}
            {stats.lastSync && (
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Last Data Sync
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Status: </span>
                      <span className={stats.lastSync.status === 'success' ? 'text-green-600' : 'text-red-500'}>
                        {stats.lastSync.status}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Records: </span>
                      <span className="text-foreground">{stats.lastSync.records_synced?.toLocaleString() || 0}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Completed: </span>
                      <span className="text-foreground">
                        {stats.lastSync.completed_at ? formatDate(stats.lastSync.completed_at) : 'In progress'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Status Breakdown */}
            {stats.statusBreakdown && Object.keys(stats.statusBreakdown).length > 0 && (
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle className="text-foreground">Application Status Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {Object.entries(stats.statusBreakdown)
                      .sort(([, a], [, b]) => b - a)
                      .map(([status, count]) => (
                        <div key={status} className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
                          <span className="text-sm text-muted-foreground">{status}</span>
                          <span className="font-medium text-foreground">{count.toLocaleString()}</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center">
                No data available. Run a sync to pull data from Salesforce.
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/report-builder"
              className="flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted transition-colors"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileBarChart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Build Report</p>
                <p className="text-sm text-muted-foreground">
                  Create a new custom report
                </p>
              </div>
            </Link>
            <Link
              href="/presets"
              className="flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted transition-colors"
            >
              <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Report Presets</p>
                <p className="text-sm text-muted-foreground">
                  Use saved report templates
                </p>
              </div>
            </Link>
            <Link
              href="/history"
              className="flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted transition-colors"
            >
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="font-medium text-foreground">Report History</p>
                <p className="text-sm text-muted-foreground">
                  View previously generated reports
                </p>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
