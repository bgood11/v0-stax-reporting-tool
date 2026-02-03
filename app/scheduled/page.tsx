"use client";

import * as React from "react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Calendar,
  Clock,
  MoreVertical,
  Play,
  Pencil,
  Pause,
  Trash2,
  Mail,
  X,
  FileText,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Frequency = "daily" | "weekly" | "monthly";
type ScheduleStatus = "active" | "paused";

interface ScheduledReport {
  id: string;
  name: string;
  presetName: string;
  frequency: Frequency;
  nextRun: string;
  recipients: string[];
  status: ScheduleStatus;
  lastRun: string;
  format: "csv" | "xlsx" | "pdf";
  createdBy: string;
}

const sampleSchedules: ScheduledReport[] = [
  {
    id: "1",
    name: "Weekly Approval Summary",
    presetName: "Monthly Approval Rate",
    frequency: "weekly",
    nextRun: "2026-02-10 09:00",
    recipients: ["john@shermin.com.au", "sarah@shermin.com.au"],
    status: "active",
    lastRun: "2026-02-03 09:00",
    format: "xlsx",
    createdBy: "Jane Doe",
  },
  {
    id: "2",
    name: "Daily Pipeline Update",
    presetName: "Application Pipeline",
    frequency: "daily",
    nextRun: "2026-02-04 07:00",
    recipients: ["team@shermin.com.au"],
    status: "active",
    lastRun: "2026-02-03 07:00",
    format: "pdf",
    createdBy: "Jane Doe",
  },
  {
    id: "3",
    name: "Monthly Commission Report",
    presetName: "Commission by Retailer",
    frequency: "monthly",
    nextRun: "2026-03-01 08:00",
    recipients: ["finance@shermin.com.au", "management@shermin.com.au"],
    status: "paused",
    lastRun: "2026-02-01 08:00",
    format: "xlsx",
    createdBy: "John Smith",
  },
  {
    id: "4",
    name: "BDM Weekly Performance",
    presetName: "BDM Performance",
    frequency: "weekly",
    nextRun: "2026-02-07 06:00",
    recipients: ["bdm-leads@shermin.com.au"],
    status: "active",
    lastRun: "2026-01-31 06:00",
    format: "pdf",
    createdBy: "Sarah Johnson",
  },
];

const presetOptions = [
  "Monthly Approval Rate",
  "Lender Conversion Funnel",
  "Commission by Retailer",
  "Application Pipeline",
  "BDM Performance",
  "Retailer Volume Trends",
];

export default function ScheduledReportsPage() {
  const [schedules, setSchedules] = React.useState(sampleSchedules);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [editingSchedule, setEditingSchedule] = React.useState<ScheduledReport | null>(null);
  const [deletingSchedule, setDeletingSchedule] = React.useState<ScheduledReport | null>(null);
  const [selectedTab, setSelectedTab] = React.useState("my-schedules");

  const [formData, setFormData] = React.useState({
    name: "",
    presetName: "",
    frequency: "weekly" as Frequency,
    time: "09:00",
    format: "xlsx" as "csv" | "xlsx" | "pdf",
    recipients: [] as string[],
    newRecipient: "",
  });

  const handleOpenNewModal = () => {
    setEditingSchedule(null);
    setFormData({
      name: "",
      presetName: "",
      frequency: "weekly",
      time: "09:00",
      format: "xlsx",
      recipients: [],
      newRecipient: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (schedule: ScheduledReport) => {
    setEditingSchedule(schedule);
    const timePart = schedule.nextRun.split(" ")[1] || "09:00";
    setFormData({
      name: schedule.name,
      presetName: schedule.presetName,
      frequency: schedule.frequency,
      time: timePart,
      format: schedule.format,
      recipients: [...schedule.recipients],
      newRecipient: "",
    });
    setIsModalOpen(true);
  };

  const handleAddRecipient = () => {
    if (formData.newRecipient && formData.newRecipient.includes("@")) {
      setFormData({
        ...formData,
        recipients: [...formData.recipients, formData.newRecipient],
        newRecipient: "",
      });
    }
  };

  const handleRemoveRecipient = (email: string) => {
    setFormData({
      ...formData,
      recipients: formData.recipients.filter((r) => r !== email),
    });
  };

  const handleSaveSchedule = () => {
    if (editingSchedule) {
      setSchedules(
        schedules.map((s) =>
          s.id === editingSchedule.id
            ? {
                ...s,
                name: formData.name,
                presetName: formData.presetName,
                frequency: formData.frequency,
                format: formData.format,
                recipients: formData.recipients,
              }
            : s
        )
      );
    } else {
      const newSchedule: ScheduledReport = {
        id: Date.now().toString(),
        name: formData.name,
        presetName: formData.presetName,
        frequency: formData.frequency,
        nextRun: `2026-02-10 ${formData.time}`,
        recipients: formData.recipients,
        status: "active",
        lastRun: "-",
        format: formData.format,
        createdBy: "Jane Doe",
      };
      setSchedules([...schedules, newSchedule]);
    }
    setIsModalOpen(false);
  };

  const handleToggleStatus = (schedule: ScheduledReport) => {
    setSchedules(
      schedules.map((s) =>
        s.id === schedule.id
          ? { ...s, status: s.status === "active" ? "paused" : "active" }
          : s
      )
    );
  };

  const handleDeleteSchedule = () => {
    if (deletingSchedule) {
      setSchedules(schedules.filter((s) => s.id !== deletingSchedule.id));
      setIsDeleteModalOpen(false);
      setDeletingSchedule(null);
    }
  };

  const handleRunNow = (schedule: ScheduledReport) => {
    alert(`Running report: ${schedule.name}`);
  };

  const mySchedules = schedules.filter((s) => s.createdBy === "Jane Doe");
  const allSchedules = schedules;

  const getFrequencyBadge = (frequency: Frequency) => {
    const colors = {
      daily: "bg-blue-100 text-blue-700",
      weekly: "bg-green-100 text-green-700",
      monthly: "bg-purple-100 text-purple-700",
    };
    return (
      <Badge variant="secondary" className={cn("capitalize", colors[frequency])}>
        {frequency}
      </Badge>
    );
  };

  const getStatusBadge = (status: ScheduleStatus) => {
    return (
      <Badge
        variant={status === "active" ? "default" : "secondary"}
        className={cn(
          status === "active"
            ? "bg-green-100 text-green-700"
            : "bg-gray-100 text-gray-600"
        )}
      >
        {status === "active" ? "Active" : "Paused"}
      </Badge>
    );
  };

  const ScheduleTable = ({ data }: { data: ScheduledReport[] }) => (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Report Name</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead className="hidden md:table-cell">Next Run</TableHead>
            <TableHead className="hidden lg:table-cell">Recipients</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell">Last Run</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((schedule) => (
            <TableRow key={schedule.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{schedule.name}</p>
                  <p className="text-sm text-muted-foreground">{schedule.presetName}</p>
                </div>
              </TableCell>
              <TableCell>{getFrequencyBadge(schedule.frequency)}</TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {schedule.nextRun}
                </div>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <div className="flex items-center gap-1">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{schedule.recipients.length} recipient(s)</span>
                </div>
              </TableCell>
              <TableCell>{getStatusBadge(schedule.status)}</TableCell>
              <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                {schedule.lastRun}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleRunNow(schedule)}>
                      <Play className="h-4 w-4 mr-2" />
                      Run Now
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleOpenEditModal(schedule)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggleStatus(schedule)}>
                      <Pause className="h-4 w-4 mr-2" />
                      {schedule.status === "active" ? "Pause" : "Resume"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setDeletingSchedule(schedule);
                        setIsDeleteModalOpen(true);
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={7}>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Clock className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">No scheduled reports</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Schedule your first report to receive automatic updates
                  </p>
                  <Button onClick={handleOpenNewModal}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Schedule
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );

  return (
    <AppLayout pageTitle="Scheduled Reports">
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Scheduled Reports</h2>
            <p className="text-muted-foreground">
              Automate report delivery to your inbox
            </p>
          </div>
          <Button
            onClick={handleOpenNewModal}
            className="bg-gradient-to-r from-primary to-accent text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Schedule
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList>
            <TabsTrigger value="my-schedules">My Schedules</TabsTrigger>
            <TabsTrigger value="all-schedules">All Schedules</TabsTrigger>
          </TabsList>
          <TabsContent value="my-schedules" className="mt-4">
            <ScheduleTable data={mySchedules} />
          </TabsContent>
          <TabsContent value="all-schedules" className="mt-4">
            <ScheduleTable data={allSchedules} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSchedule ? "Edit Schedule" : "Create New Schedule"}
            </DialogTitle>
            <DialogDescription>
              Configure your automated report delivery settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Schedule Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Weekly Approval Summary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preset">Report Preset</Label>
              <Select
                value={formData.presetName}
                onValueChange={(value) => setFormData({ ...formData, presetName: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a preset" />
                </SelectTrigger>
                <SelectContent>
                  {presetOptions.map((preset) => (
                    <SelectItem key={preset} value={preset}>
                      {preset}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value: Frequency) =>
                    setFormData({ ...formData, frequency: value })
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
              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="format">Export Format</Label>
              <Select
                value={formData.format}
                onValueChange={(value: "csv" | "xlsx" | "pdf") =>
                  setFormData({ ...formData, format: value })
                }
              >
                <SelectTrigger>
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
              <Label>Recipients</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={formData.newRecipient}
                  onChange={(e) => setFormData({ ...formData, newRecipient: e.target.value })}
                  placeholder="email@example.com"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddRecipient())}
                />
                <Button type="button" variant="outline" onClick={handleAddRecipient}>
                  Add
                </Button>
              </div>
              {formData.recipients.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.recipients.map((email) => (
                    <Badge key={email} variant="secondary" className="gap-1 pr-1">
                      {email}
                      <button
                        type="button"
                        onClick={() => handleRemoveRecipient(email)}
                        className="ml-1 hover:bg-muted rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                        <span className="sr-only">Remove {email}</span>
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveSchedule}
              disabled={!formData.name || !formData.presetName || formData.recipients.length === 0}
              className="bg-gradient-to-r from-primary to-accent text-white"
            >
              {editingSchedule ? "Save Changes" : "Create Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Delete Schedule
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deletingSchedule?.name}&rdquo;? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSchedule}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
