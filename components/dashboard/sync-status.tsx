"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, RefreshCw, Clock, AlertCircle } from "lucide-react";

interface SyncStatusData {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: "success" | "error" | "running";
  records_synced: number;
  error_message: string | null;
}

interface SyncStatusProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function SyncStatus({ autoRefresh = true, refreshInterval = 60000 }: SyncStatusProps) {
  const [syncData, setSyncData] = useState<SyncStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSyncStatus = async () => {
    try {
      setError(null);
      const response = await fetch("/api/sync?action=status");
      const data = await response.json();

      if (data.lastSync) {
        setSyncData(data.lastSync);
      } else {
        setError("No sync data available");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch sync status");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRetrySync = async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/sync", { method: "POST" });
      const data = await response.json();

      if (data.success) {
        // Refresh the sync status
        await fetchSyncStatus();
      } else {
        setError(data.error || "Sync failed");
      }
    } catch (err: any) {
      setError(err.message || "Failed to trigger sync");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSyncStatus();

    // Set up auto-refresh if enabled
    if (autoRefresh) {
      const interval = setInterval(fetchSyncStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) {
      return "just now";
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    } else if (seconds < 86400) {
      const hours = Math.floor(seconds / 3600);
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    } else {
      const days = Math.floor(seconds / 86400);
      return `${days} day${days > 1 ? "s" : ""} ago`;
    }
  };

  const getNextSyncTime = (dateString: string) => {
    const date = new Date(dateString);
    const nextSync = new Date(date);
    nextSync.setDate(nextSync.getDate() + 1);
    nextSync.setHours(1, 0, 0, 0);
    return nextSync.toLocaleString("en-GB", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatExactTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Sync Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !syncData) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Sync Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-red-500">{error}</p>
            <Button
              onClick={handleRetrySync}
              disabled={refreshing}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {refreshing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Trigger Sync Now
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!syncData) {
    return null;
  }

  const isSuccess = syncData.status === "success";
  const isRunning = syncData.status === "running";
  const isFailed = syncData.status === "error";

  return (
    <Card className={`bg-card border-border ${isFailed ? "border-red-500/30" : ""}`}>
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          {isSuccess && <CheckCircle className="h-5 w-5 text-green-500" />}
          {isFailed && <XCircle className="h-5 w-5 text-red-500" />}
          {isRunning && <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />}
          Sync Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Badge */}
        <div className="flex items-center gap-3">
          <div
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              isSuccess
                ? "bg-green-500/20 text-green-700"
                : isFailed
                  ? "bg-red-500/20 text-red-700"
                  : "bg-blue-500/20 text-blue-700"
            }`}
          >
            {isSuccess && "✓ Success"}
            {isFailed && "✗ Failed"}
            {isRunning && "⟳ Running"}
          </div>
          <span className="text-sm text-muted-foreground">
            {getTimeAgo(syncData.completed_at || syncData.started_at)}
          </span>
        </div>

        {/* Status Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs font-medium mb-1">Records Synced</p>
            <p className="text-lg font-semibold text-foreground">
              {syncData.records_synced.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium mb-1">Last Updated</p>
            <p className="text-sm text-foreground truncate">
              {formatExactTime(syncData.completed_at || syncData.started_at)}
            </p>
          </div>
        </div>

        {/* Next Sync */}
        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">Next scheduled sync</p>
          <p className="text-sm font-medium text-foreground">
            {getNextSyncTime(syncData.completed_at || syncData.started_at)}
          </p>
        </div>

        {/* Error Message */}
        {isFailed && syncData.error_message && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3">
            <p className="text-xs font-medium text-red-700 mb-1">Error Details</p>
            <p className="text-sm text-red-600 break-words">{syncData.error_message}</p>
          </div>
        )}

        {/* Retry Button */}
        {(isFailed || isSuccess) && (
          <Button
            onClick={handleRetrySync}
            disabled={refreshing}
            variant={isFailed ? "default" : "outline"}
            className={`w-full ${
              isFailed ? "bg-primary hover:bg-primary/90" : "border-border hover:bg-muted"
            }`}
          >
            {refreshing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                {isFailed ? "Retry Sync" : "Sync Now"}
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
