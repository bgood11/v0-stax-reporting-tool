"use client";

import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileBarChart, TrendingUp, Users, DollarSign } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const stats = [
    {
      title: "Total Reports",
      value: "24",
      change: "+3 this week",
      icon: FileBarChart,
    },
    {
      title: "Active Lenders",
      value: "12",
      change: "2 new",
      icon: Users,
    },
    {
      title: "Total Loan Value",
      value: "$4.2M",
      change: "+12% this month",
      icon: DollarSign,
    },
    {
      title: "Approval Rate",
      value: "78%",
      change: "+5% vs last month",
      icon: TrendingUp,
    },
  ];

  return (
    <AppLayout pageTitle="Dashboard">
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Welcome back, Jane
            </h2>
            <p className="text-muted-foreground">
              Here&apos;s an overview of your reporting activity
            </p>
          </div>
          <Button asChild className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
            <Link href="/report-builder">
              <FileBarChart className="h-4 w-4 mr-2" />
              New Report
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
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
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

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
                <Users className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="font-medium text-foreground">View Presets</p>
                <p className="text-sm text-muted-foreground">
                  Access saved report templates
                </p>
              </div>
            </Link>
            <Link
              href="/scheduled"
              className="flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted transition-colors"
            >
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="font-medium text-foreground">Scheduled Reports</p>
                <p className="text-sm text-muted-foreground">
                  Manage automated reports
                </p>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
