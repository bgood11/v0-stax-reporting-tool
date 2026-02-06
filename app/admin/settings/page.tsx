"use client";

import * as React from "react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  RefreshCw,
  FileText,
  Mail,
  BookMarked,
  AlertTriangle,
  Save,
  Trash2,
} from "lucide-react";

export default function SettingsPage() {
  const [isSaving, setIsSaving] = React.useState(false);

  // Data Sync Settings
  const [syncInterval, setSyncInterval] = React.useState("15");
  const [autoSync, setAutoSync] = React.useState(true);

  // Default Report Settings
  const [defaultDateRange, setDefaultDateRange] = React.useState("last30days");
  const [defaultExportFormat, setDefaultExportFormat] = React.useState("xlsx");
  const [defaultPageSize, setDefaultPageSize] = React.useState("25");

  // Email Settings
  const [emailNotifications, setEmailNotifications] = React.useState(true);
  const [scheduleReminders, setScheduleReminders] = React.useState(true);
  const [adminAlerts, setAdminAlerts] = React.useState(true);
  const [replyToEmail, setReplyToEmail] = React.useState("noreply@sherminfinance.co.uk");

  // Preset Management
  const [allowCustomPresets, setAllowCustomPresets] = React.useState(true);
  const [maxPresetsPerUser, setMaxPresetsPerUser] = React.useState("10");

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    alert("Settings saved successfully!");
  };

  const handleClearCache = () => {
    alert("Cache cleared successfully!");
  };

  const handleDeleteAllPresets = () => {
    if (confirm("Are you sure you want to delete all custom presets? This action cannot be undone.")) {
      alert("All custom presets have been deleted.");
    }
  };

  return (
    <AppLayout pageTitle="System Settings">
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">System Settings</h2>
            <p className="text-muted-foreground">
              Configure system-wide preferences and defaults
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-gradient-to-r from-primary to-accent text-white"
          >
            {isSaving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Data Sync Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-primary" />
                <CardTitle>Data Sync</CardTitle>
              </div>
              <CardDescription>
                Configure how often data is synchronized from the source system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-sync enabled</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically sync data at regular intervals
                  </p>
                </div>
                <Switch checked={autoSync} onCheckedChange={setAutoSync} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sync-interval">Sync interval (minutes)</Label>
                <Select value={syncInterval} onValueChange={setSyncInterval}>
                  <SelectTrigger id="sync-interval">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={handleClearCache}>
                Clear Data Cache
              </Button>
            </CardContent>
          </Card>

          {/* Default Report Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle>Report Defaults</CardTitle>
              </div>
              <CardDescription>
                Set default values for new reports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="date-range">Default date range</Label>
                <Select value={defaultDateRange} onValueChange={setDefaultDateRange}>
                  <SelectTrigger id="date-range">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last7days">Last 7 days</SelectItem>
                    <SelectItem value="last30days">Last 30 days</SelectItem>
                    <SelectItem value="lastMonth">Last month</SelectItem>
                    <SelectItem value="lastQuarter">Last quarter</SelectItem>
                    <SelectItem value="ytd">Year to date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="export-format">Default export format</Label>
                <Select value={defaultExportFormat} onValueChange={setDefaultExportFormat}>
                  <SelectTrigger id="export-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="page-size">Default page size</Label>
                <Select value={defaultPageSize} onValueChange={setDefaultPageSize}>
                  <SelectTrigger id="page-size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 rows</SelectItem>
                    <SelectItem value="25">25 rows</SelectItem>
                    <SelectItem value="50">50 rows</SelectItem>
                    <SelectItem value="100">100 rows</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Email Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                <CardTitle>Email Settings</CardTitle>
              </div>
              <CardDescription>
                Configure email notifications and delivery
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable email notifications globally
                  </p>
                </div>
                <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Schedule reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify users before scheduled reports run
                  </p>
                </div>
                <Switch checked={scheduleReminders} onCheckedChange={setScheduleReminders} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Admin alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Send alerts for system events to admins
                  </p>
                </div>
                <Switch checked={adminAlerts} onCheckedChange={setAdminAlerts} />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="reply-to">Reply-to email address</Label>
                <Input
                  id="reply-to"
                  type="email"
                  value={replyToEmail}
                  onChange={(e) => setReplyToEmail(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Preset Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BookMarked className="h-5 w-5 text-primary" />
                <CardTitle>Preset Management</CardTitle>
              </div>
              <CardDescription>
                Configure preset creation and limits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow custom presets</Label>
                  <p className="text-sm text-muted-foreground">
                    Let users create their own report presets
                  </p>
                </div>
                <Switch checked={allowCustomPresets} onCheckedChange={setAllowCustomPresets} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-presets">Max presets per user</Label>
                <Select value={maxPresetsPerUser} onValueChange={setMaxPresetsPerUser}>
                  <SelectTrigger id="max-presets">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 presets</SelectItem>
                    <SelectItem value="10">10 presets</SelectItem>
                    <SelectItem value="20">20 presets</SelectItem>
                    <SelectItem value="unlimited">Unlimited</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
            </div>
            <CardDescription>
              Irreversible actions that affect the entire system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/5">
              <div>
                <p className="font-medium text-foreground">Delete all custom presets</p>
                <p className="text-sm text-muted-foreground">
                  Permanently remove all user-created presets from the system
                </p>
              </div>
              <Button variant="destructive" onClick={handleDeleteAllPresets}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete All
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
