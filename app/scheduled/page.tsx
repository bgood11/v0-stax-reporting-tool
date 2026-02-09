"use client";

import * as React from "react";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar,
  Clock,
  Plus,
  MoreVertical,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  Mail,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from "lucide-react";
import { EmptyState } from "@/components/report-results/empty-state";

interface ScheduledReport {
  id: string;
  name: string;
  config: {
    reportType: string;
    groupBy: string[];
    metrics: string[];
  };
  schedule_type: 'daily' | 'weekly' | 'monthly';
  schedule_day?: number;
  schedule_time: string;
  recipients: string[];
  is_active: boolean;
  last_run_at?: string;
  next_run_at?: string;
  created_at: string;
}

interface ScheduledReportRun {
  id: string;
  started_at: string;
  completed_at?: string;
  status: 'running' | 'success' | 'failed';
  record_count?: number;
  error_message?: string;
  email_sent: boolean;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export default function ScheduledPage() {
  const [schedules, setSchedules] = React.useState<ScheduledReport[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);
  const [creating, setCreating] = React.useState(false);

  // Form state
  const [formData, setFormData] = React.useState({
    name: '',
    schedule_type: 'weekly' as 'daily' | 'weekly' | 'monthly',
    schedule_day: 1,
    schedule_time: '09:00',
    recipients: '',
    reportType: 'AD',
    groupBy: ['lender'],
    metrics: ['totalApplications', 'loanValue', 'approvalRate'],
  });

  // Fetch schedules
  React.useEffect(() => {
    fetch('/api/reports/schedules')
      .then(res => res.json())
      .then(data => {
        if (data.schedules) {
          setSchedules(data.schedules);
        }
      })
      .catch(err => console.error('Failed to load schedules:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleCreateSchedule = async () => {
    setCreating(true);
    try {
      const response = await fetch('/api/reports/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          config: {
            reportType: formData.reportType,
            groupBy: formData.groupBy,
            metrics: formData.metrics,
          },
          schedule_type: formData.schedule_type,
          schedule_day: formData.schedule_type !== 'daily' ? formData.schedule_day : undefined,
          schedule_time: formData.schedule_time,
          recipients: formData.recipients.split(',').map(e => e.trim()).filter(Boolean),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSchedules(prev => [data.schedule, ...prev]);
        setShowCreateDialog(false);
        setFormData({
          name: '',
          schedule_type: 'weekly',
          schedule_day: 1,
          schedule_time: '09:00',
          recipients: '',
          reportType: 'AD',
          groupBy: ['lender'],
          metrics: ['totalApplications', 'loanValue', 'approvalRate'],
        });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create schedule');
      }
    } catch (err) {
      console.error('Failed to create schedule:', err);
      alert('Failed to create schedule');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (schedule: ScheduledReport) => {
    try {
      const response = await fetch(`/api/reports/schedules/${schedule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !schedule.is_active }),
      });

      if (response.ok) {
        const data = await response.json();
        setSchedules(prev =>
          prev.map(s => s.id === schedule.id ? data.schedule : s)
        );
      }
    } catch (err) {
      console.error('Failed to toggle schedule:', err);
    }
  };

  const handleDeleteSchedule = async (schedule: ScheduledReport) => {
    if (!confirm(`Are you sure you want to delete "${schedule.name}"?`)) return;

    try {
      const response = await fetch(`/api/reports/schedules/${schedule.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSchedules(prev => prev.filter(s => s.id !== schedule.id));
      }
    } catch (err) {
      console.error('Failed to delete schedule:', err);
    }
  };

  const formatSchedule = (schedule: ScheduledReport) => {
    const time = schedule.schedule_time?.slice(0, 5) || '09:00';

    switch (schedule.schedule_type) {
      case 'daily':
        return `Daily at ${time}`;
      case 'weekly':
        const day = DAYS_OF_WEEK.find(d => d.value === schedule.schedule_day)?.label || 'Monday';
        return `Every ${day} at ${time}`;
      case 'monthly':
        const suffix = ['th', 'st', 'nd', 'rd'][
          schedule.schedule_day === 1 || schedule.schedule_day === 21 || schedule.schedule_day === 31 ? 1 :
          schedule.schedule_day === 2 || schedule.schedule_day === 22 ? 2 :
          schedule.schedule_day === 3 || schedule.schedule_day === 23 ? 3 : 0
        ];
        return `Monthly on the ${schedule.schedule_day}${suffix} at ${time}`;
      default:
        return schedule.schedule_type;
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AppLayout pageTitle="Scheduled Reports">
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Scheduled Reports</h2>
            <p className="text-muted-foreground">
              Automatically generate and deliver reports on a schedule
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-accent text-white">
                <Plus className="h-4 w-4 mr-2" />
                New Schedule
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create Scheduled Report</DialogTitle>
                <DialogDescription>
                  Set up a report to run automatically on a schedule
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Schedule Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Weekly Lender Report"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select
                      value={formData.schedule_type}
                      onValueChange={(value: 'daily' | 'weekly' | 'monthly') =>
                        setFormData(prev => ({ ...prev, schedule_type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.schedule_type === 'weekly' && (
                    <div className="space-y-2">
                      <Label>Day of Week</Label>
                      <Select
                        value={String(formData.schedule_day)}
                        onValueChange={(value) =>
                          setFormData(prev => ({ ...prev, schedule_day: parseInt(value) }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS_OF_WEEK.map(day => (
                            <SelectItem key={day.value} value={String(day.value)}>
                              {day.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {formData.schedule_type === 'monthly' && (
                    <div className="space-y-2">
                      <Label>Day of Month</Label>
                      <Select
                        value={String(formData.schedule_day)}
                        onValueChange={(value) =>
                          setFormData(prev => ({ ...prev, schedule_day: parseInt(value) }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                            <SelectItem key={day} value={String(day)}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time">Time (24h format)</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.schedule_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, schedule_time: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Report Type</Label>
                  <Select
                    value={formData.reportType}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, reportType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AD">Application Decisions (AD)</SelectItem>
                      <SelectItem value="AP">Approved & Paid (AP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipients">Email Recipients</Label>
                  <Input
                    id="recipients"
                    value={formData.recipients}
                    onChange={(e) => setFormData(prev => ({ ...prev, recipients: e.target.value }))}
                    placeholder="email1@company.com, email2@company.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Separate multiple emails with commas
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateSchedule}
                  disabled={creating || !formData.name || !formData.recipients}
                >
                  {creating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Schedule'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : schedules.length === 0 ? (
          <EmptyState
            type="no-data"
            title="No scheduled reports"
            description="Create your first scheduled report to automatically generate and email reports on a regular basis."
            action={{
              label: "Create Schedule",
              onClick: () => setShowCreateDialog(true),
            }}
          />
        ) : (
          <div className="grid gap-4">
            {schedules.map((schedule) => (
              <Card key={schedule.id} className="bg-card">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg font-medium text-foreground">
                        {schedule.name}
                      </CardTitle>
                      <Badge variant={schedule.is_active ? "default" : "secondary"}>
                        {schedule.is_active ? "Active" : "Paused"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={schedule.is_active}
                        onCheckedChange={() => handleToggleActive(schedule)}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleDeleteSchedule(schedule)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                    <div>
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Clock className="h-4 w-4" />
                        Schedule
                      </div>
                      <span className="font-medium text-foreground">
                        {formatSchedule(schedule)}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Calendar className="h-4 w-4" />
                        Next Run
                      </div>
                      <span className="font-medium text-foreground">
                        {schedule.is_active ? formatDate(schedule.next_run_at) : '-'}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <CheckCircle2 className="h-4 w-4" />
                        Last Run
                      </div>
                      <span className="font-medium text-foreground">
                        {formatDate(schedule.last_run_at)}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Mail className="h-4 w-4" />
                        Recipients
                      </div>
                      <span className="font-medium text-foreground">
                        {schedule.recipients.length} recipient{schedule.recipients.length !== 1 ? 's' : ''}
                      </span>
                    </div>
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
