"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/report-results/empty-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  TrendingUp,
  BarChart3,
  DollarSign,
  Clock,
  Users,
  Building2,
  PieChart,
  Layers,
  Plus,
  MoreVertical,
  Play,
  Pencil,
  Copy,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

type PresetCategory = "all" | "volume" | "rates" | "financial" | "pipeline";

interface BuiltInPreset {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: PresetCategory;
  tags: string[];
  reportType: string;
  groupBy: string[];
  metrics: string[];
}

interface CustomPreset {
  id: string;
  name: string;
  description: string;
  category: PresetCategory;
  tags: string[];
  isCustom: true;
  created_at: string;
  config: Record<string, unknown>;
}

// Built-in report templates
const builtInPresets: BuiltInPreset[] = [
  {
    id: "builtin-1",
    name: "Monthly Approval Rate by Lender",
    description: "Approval rates broken down by lender and month, with application volumes",
    icon: TrendingUp,
    category: "rates",
    tags: ["Approval", "Monthly"],
    reportType: "AD",
    groupBy: ["lender", "month"],
    metrics: ["approvalRate", "totalApplications"],
  },
  {
    id: "builtin-2",
    name: "Lender Execution Rates",
    description: "Application volume and execution rates by lender - approved to settled conversion",
    icon: BarChart3,
    category: "pipeline",
    tags: ["Execution", "Lender"],
    reportType: "AD",
    groupBy: ["lender"],
    metrics: ["executionRate", "totalApplications", "approvalRate"],
  },
  {
    id: "builtin-3",
    name: "Commission by Retailer",
    description: "Total commission and loan value by retailer and finance product type",
    icon: DollarSign,
    category: "financial",
    tags: ["Commission", "Retailer"],
    reportType: "AD",
    groupBy: ["retailer", "product"],
    metrics: ["commission", "loanValue"],
  },
  {
    id: "builtin-4",
    name: "Application Status Breakdown",
    description: "Application volumes and values grouped by current status",
    icon: Clock,
    category: "pipeline",
    tags: ["Pipeline", "Status"],
    reportType: "AD",
    groupBy: ["status"],
    metrics: ["totalApplications", "loanValue"],
  },
  {
    id: "builtin-5",
    name: "BDM Performance",
    description: "Compare BDM performance - application volume, approval rate, and commission",
    icon: Users,
    category: "volume",
    tags: ["BDM", "Performance"],
    reportType: "AD",
    groupBy: ["bdm"],
    metrics: ["totalApplications", "approvalRate", "commission"],
  },
  {
    id: "builtin-6",
    name: "Weekly Retailer Volume",
    description: "Application volume and loan value by retailer, broken down weekly",
    icon: Building2,
    category: "volume",
    tags: ["Volume", "Weekly"],
    reportType: "AD",
    groupBy: ["retailer", "week"],
    metrics: ["totalApplications", "loanValue"],
  },
  {
    id: "builtin-7",
    name: "Finance Product Breakdown",
    description: "Application volume and values by finance product type",
    icon: PieChart,
    category: "rates",
    tags: ["Products", "Analysis"],
    reportType: "AD",
    groupBy: ["product"],
    metrics: ["totalApplications", "loanValue", "approvalRate"],
  },
  {
    id: "builtin-8",
    name: "Prime vs Sub-Prime",
    description: "Compare prime and sub-prime applications - volume, approval rates, and values",
    icon: Layers,
    category: "rates",
    tags: ["Prime", "Sub-Prime"],
    reportType: "AD",
    groupBy: ["primeSubprime"],
    metrics: ["totalApplications", "approvalRate", "loanValue"],
  },
];

const categories: { value: PresetCategory; label: string }[] = [
  { value: "all", label: "All Presets" },
  { value: "volume", label: "Volume" },
  { value: "rates", label: "Rates" },
  { value: "financial", label: "Financial" },
  { value: "pipeline", label: "Pipeline" },
];

// Map category based on report type or config
function inferCategory(config: Record<string, unknown>): PresetCategory {
  const reportType = (config.reportType as string)?.toLowerCase() || '';
  if (reportType.includes('commission') || reportType.includes('financial')) return 'financial';
  if (reportType.includes('pipeline') || reportType.includes('conversion')) return 'pipeline';
  if (reportType.includes('volume') || reportType.includes('bdm')) return 'volume';
  return 'rates';
}

export default function PresetsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<PresetCategory>("all");
  const [customPresets, setCustomPresets] = React.useState<CustomPreset[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Fetch custom presets from API
  React.useEffect(() => {
    fetch('/api/reports/presets')
      .then(res => res.json())
      .then(data => {
        if (data.presets) {
          setCustomPresets(data.presets.map((p: { id: string; name: string; config: Record<string, unknown>; created_at: string }) => ({
            id: p.id,
            name: p.name,
            description: p.config?.description || 'Custom saved preset',
            category: inferCategory(p.config || {}),
            tags: ['Custom'],
            isCustom: true,
            created_at: p.created_at,
            config: p.config,
          })));
        }
      })
      .catch(err => console.error('Failed to load presets:', err))
      .finally(() => setLoading(false));
  }, []);

  const filterBuiltInPresets = (presets: BuiltInPreset[]) => {
    return presets.filter((preset) => {
      const matchesSearch =
        preset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        preset.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "all" || preset.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  };

  const filterCustomPresets = (presets: CustomPreset[]) => {
    return presets.filter((preset) => {
      const matchesSearch =
        preset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        preset.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "all" || preset.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  };

  const filteredBuiltIn = filterBuiltInPresets(builtInPresets);
  const filteredCustom = filterCustomPresets(customPresets);

  const handleRunBuiltInPreset = (preset: BuiltInPreset) => {
    // Navigate to report builder with preset config
    const params = new URLSearchParams({
      reportType: preset.reportType,
      groupBy: preset.groupBy.join(','),
      metrics: preset.metrics.join(','),
    });
    router.push(`/report-builder?${params.toString()}`);
  };

  const handleRunCustomPreset = (preset: CustomPreset) => {
    // Navigate to report builder with saved config
    const params = new URLSearchParams({
      presetId: preset.id,
    });
    router.push(`/report-builder?${params.toString()}`);
  };

  const handleDeletePreset = async (preset: CustomPreset) => {
    if (!confirm(`Are you sure you want to delete "${preset.name}"?`)) return;

    try {
      const res = await fetch(`/api/reports/presets/${preset.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setCustomPresets(prev => prev.filter(p => p.id !== preset.id));
      }
    } catch (err) {
      console.error('Failed to delete preset:', err);
    }
  };

  return (
    <AppLayout pageTitle="Presets">
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Report Presets</h2>
            <p className="text-muted-foreground">
              Quick-start templates for common reporting needs
            </p>
          </div>
          <Button
            className="bg-gradient-to-r from-primary to-accent text-white"
            onClick={() => router.push('/report-builder')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Custom Report
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search presets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map((category) => (
              <Button
                key={category.value}
                variant={selectedCategory === category.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.value)}
                className={cn(
                  selectedCategory === category.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                )}
              >
                {category.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Built-in Presets */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Built-in Presets</h3>
          {filteredBuiltIn.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/50">
              <div className="py-12 px-4">
                <p className="text-center text-muted-foreground text-sm">
                  No built-in presets match your search. Try adjusting your filters or search terms.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredBuiltIn.map((preset) => (
                <BuiltInPresetCard
                  key={preset.id}
                  preset={preset}
                  onRun={handleRunBuiltInPreset}
                />
              ))}
            </div>
          )}
        </div>

        {/* Custom Presets */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Custom Presets</h3>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredCustom.map((preset) => (
                <CustomPresetCard
                  key={preset.id}
                  preset={preset}
                  onRun={handleRunCustomPreset}
                  onDelete={handleDeletePreset}
                />
              ))}
              {/* Create New Card */}
              <Card
                className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer group"
                onClick={() => router.push('/report-builder')}
              >
                <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
                    <Plus className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <p className="font-medium text-foreground">Create Custom Preset</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Build and save your report configuration
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
          {!loading && filteredCustom.length === 0 && searchQuery && (
            <div className="rounded-xl border border-border bg-muted/50">
              <div className="py-8 px-4">
                <p className="text-center text-muted-foreground text-sm">
                  No custom presets match your search. Try adjusting your filters or search terms.
                </p>
              </div>
            </div>
          )}
          {!loading && customPresets.length === 0 && !searchQuery && (
            <div className="rounded-xl border border-border bg-muted/50">
              <div className="py-8 px-4">
                <p className="text-center text-muted-foreground text-sm">
                  You haven&apos;t created any custom presets yet. Generate a report and save it as a preset for quick access.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

interface BuiltInPresetCardProps {
  preset: BuiltInPreset;
  onRun: (preset: BuiltInPreset) => void;
}

function BuiltInPresetCard({ preset, onRun }: BuiltInPresetCardProps) {
  const Icon = preset.icon;

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onRun(preset)}
          >
            <Play className="h-4 w-4 mr-1" />
            Run
          </Button>
        </div>
        <CardTitle className="text-base mt-3">{preset.name}</CardTitle>
        <CardDescription className="text-sm line-clamp-2">
          {preset.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-1.5">
          {preset.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs font-normal">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface CustomPresetCardProps {
  preset: CustomPreset;
  onRun: (preset: CustomPreset) => void;
  onDelete: (preset: CustomPreset) => void;
}

function CustomPresetCard({ preset, onRun, onDelete }: CustomPresetCardProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-secondary" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onRun(preset)}>
                <Play className="h-4 w-4 mr-2" />
                Run Report
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(preset)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardTitle className="text-base mt-3">{preset.name}</CardTitle>
        <CardDescription className="text-sm line-clamp-2">
          {preset.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-1.5">
          {preset.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs font-normal">
              {tag}
            </Badge>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Created {formatDate(preset.created_at)}
        </p>
      </CardContent>
    </Card>
  );
}
