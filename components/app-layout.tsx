"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileBarChart,
  BookMarked,
  Clock,
  Shield,
  LogOut,
  RefreshCw,
  Menu,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Report Builder", href: "/report-builder", icon: FileBarChart },
  { label: "Presets", href: "/presets", icon: BookMarked },
  { label: "History", href: "/history", icon: Clock },
  { label: "Admin", href: "/admin", icon: Shield, adminOnly: true },
];

interface AppLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
}

interface User {
  name: string;
  email: string;
  role: string;
}

export function AppLayout({ children, pageTitle }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [lastSync, setLastSync] = React.useState<string | null>(null);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [user, setUser] = React.useState<User | null>(null);

  // Fetch user info and last sync on mount
  React.useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {});

    fetch('/api/dashboard')
      .then(res => res.json())
      .then(data => {
        if (data.lastSync?.completed_at) {
          setLastSync(data.lastSync.completed_at);
        }
      })
      .catch(() => {});
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/cron/sync');
      const data = await res.json();
      if (data.success) {
        setLastSync(new Date().toISOString());
      }
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  const formatSyncTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isAdmin = user?.role === 'global_admin' || user?.role === 'admin';

  return (
    <SidebarProvider>
      <Sidebar className="border-r border-border">
        <SidebarHeader className="p-4 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-primary">STAX</span>
          </Link>
          <p className="text-xs text-muted-foreground mt-1">Reporting Tool</p>
        </SidebarHeader>

        <SidebarContent className="p-2">
          <SidebarMenu>
            {navItems
              .filter(item => !item.adminOnly || isAdmin)
              .map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {user ? getInitials(user.name || user.email) : '??'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.name || user?.email || 'Loading...'}
              </p>
              <Badge
                variant="outline"
                className="text-xs mt-0.5 text-muted-foreground border-muted-foreground/30"
              >
                {user?.role || 'User'}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={handleLogout}
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Logout</span>
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b border-border bg-card px-4 md:px-6">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </SidebarTrigger>
            <h1 className="text-lg font-semibold text-foreground">
              {pageTitle || "Dashboard"}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <div
                className={cn(
                  "h-2 w-2 rounded-full",
                  isSyncing ? "bg-yellow-500 animate-pulse" : "bg-green-500"
                )}
              />
              <span>
                {isSyncing
                  ? "Syncing..."
                  : lastSync
                    ? `Last sync: ${formatSyncTime(lastSync)}`
                    : "Not synced yet"}
              </span>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleSync}
                  disabled={isSyncing}
                  title="Manually trigger sync"
                >
                  <RefreshCw
                    className={cn("h-4 w-4", isSyncing && "animate-spin")}
                  />
                  <span className="sr-only">Sync data</span>
                </Button>
              )}
            </div>

            <Avatar className="h-8 w-8 md:hidden">
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                {user ? getInitials(user.name || user.email) : '??'}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-background">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
