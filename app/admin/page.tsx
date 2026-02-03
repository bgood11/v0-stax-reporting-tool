"use client";

import Link from "next/link";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Settings, ChevronRight } from "lucide-react";

const adminSections = [
  {
    title: "User Management",
    description: "Manage user accounts, roles, and permissions",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "Audit Log",
    description: "View system activity and user actions",
    href: "/admin/audit-log",
    icon: FileText,
  },
  {
    title: "System Settings",
    description: "Configure system-wide preferences",
    href: "/admin/settings",
    icon: Settings,
  },
];

export default function AdminPage() {
  return (
    <AppLayout pageTitle="Admin">
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Administration</h2>
          <p className="text-muted-foreground">
            Manage users, view audit logs, and configure system settings
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {adminSections.map((section) => {
            const Icon = section.icon;
            return (
              <Link key={section.href} href={section.href}>
                <Card className="h-full hover:shadow-md hover:border-primary/50 transition-all cursor-pointer group">
                  <CardHeader>
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="flex items-center justify-between">
                      {section.title}
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
