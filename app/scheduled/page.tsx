"use client";

import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function ScheduledPage() {
  return (
    <AppLayout pageTitle="Scheduled Reports">
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Scheduled Reports</h2>
          <p className="text-muted-foreground">
            Automatically generate and deliver reports on a schedule
          </p>
        </div>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Coming Soon
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              The scheduled reports feature is currently under development. Soon you&apos;ll be able to:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Schedule reports to run daily, weekly, or monthly
              </li>
              <li className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Set up automatic email delivery to stakeholders
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-primary" />
                Export reports in multiple formats (Excel, PDF, CSV)
              </li>
            </ul>
            <div className="pt-4">
              <p className="text-sm text-muted-foreground mb-4">
                In the meantime, you can generate reports manually using the Report Builder.
              </p>
              <Button asChild>
                <Link href="/report-builder">
                  Go to Report Builder
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
