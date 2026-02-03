"use client";

import * as React from "react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

type PresetCategory = "all" | "volume" | "rates" | "financial" | "pipeline";

interface Preset {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: PresetCategory;
  tags: string[];
  isCustom?: boolean;
  createdBy?: string;
}

const builtInPresets: Preset[] = [
  {
    id: "1",
    name: "Monthly Approval Rate",
    description: "Track approval rates across all lenders by month with trend analysis",
    icon: TrendingUp,
    category: "rates",
    tags: ["Trending", "Monthly"],
  },
  {
    id: "2",
    name: "Lender Conversion Funnel",
    description: "Visualize application-to-settlement conversion by lender",
    icon: BarChart3,
    category: "pipeline",
    tags: ["Funnel", "Lender"],
  },
  {
    id: "3",
    name: "Commission by Retailer",
    description: "Total commission earned broken down by retailer and product type",
    icon: DollarSign,
    category: "financial",
    tags: ["Commission", "Retailer"],
  },
  {
    id: "4",
    name: "Application Pipeline",
    description: "Current applications in progress grouped by status and age",
    icon: Clock,
    category: "pipeline",
    tags: ["Pipeline", "Status"],
  },
  {
    id: "5",
    name: "BDM Performance",
    description: "Compare BDM performance metrics including volume and conversion",
    icon: Users,
    category: "volume",
    tags: ["BDM", "Performance"],
  },
  {
    id: "6",
    name: "Retailer Volume Trends",
    description: "Weekly application volume trends by retailer over time",
    icon: Building2,
    category: "volume",
    tags: ["Volume", "Trends"],
  },
  {
    id: "7",
    name: "Product Mix Analysis",
    description: "Distribution of finance products across all applications",
    icon: PieChart,
    category: "rates",
    tags: ["Products", "Analysis"],
  },
  {
    id: "8",
    name: "Prime vs Sub-Prime Split",
    description: "Compare prime and sub-prime application metrics side by side",
    icon: Layers,
    category: "rates",
    tags: ["Prime", "Sub-Prime"],
  },
];

const customPresets: Preset[] = [
  {
    id: "custom-1",
    name: "Q4 Lender Review",
    description: "Custom quarterly review for top 5 lenders",
    icon: BarChart3,
    category: "volume",
    tags: ["Custom", "Quarterly"],
    isCustom: true,
    createdBy: "Jane Doe",
  },
  {
    id: "custom-2",
    name: "Harvey Norman Weekly",
    description: "Weekly performance snapshot for Harvey Norman accounts",
    icon: Building2,
    category: "volume",
    tags: ["Custom", "Weekly"],
    isCustom: true,
    createdBy: "John Smith",
  },
];

const categories: { value: PresetCategory; label: string }[] = [
  { value: "all", label: "All Presets" },
  { value: "volume", label: "Volume" },
  { value: "rates", label: "Rates" },
  { value: "financial", label: "Financial" },
  { value: "pipeline", label: "Pipeline" },
];

export default function PresetsPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<PresetCategory>("all");

  const filterPresets = (presets: Preset[]) => {
    return presets.filter((preset) => {
      const matchesSearch =
        preset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        preset.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "all" || preset.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  };

  const filteredBuiltIn = filterPresets(builtInPresets);
  const filteredCustom = filterPresets(customPresets);

  const handleRunPreset = (preset: Preset) => {
    alert(`Running preset: ${preset.name}`);
  };

  const handleEditPreset = (preset: Preset) => {
    alert(`Editing preset: ${preset.name}`);
  };

  const handleDuplicatePreset = (preset: Preset) => {
    alert(`Duplicating preset: ${preset.name}`);
  };

  const handleDeletePreset = (preset: Preset) => {
    alert(`Deleting preset: ${preset.name}`);
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
          <Button className="bg-gradient-to-r from-primary to-accent text-white">
            <Plus className="h-4 w-4 mr-2" />
            Create Custom Preset
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredBuiltIn.map((preset) => (
              <PresetCard
                key={preset.id}
                preset={preset}
                onRun={handleRunPreset}
                onEdit={handleEditPreset}
                onDuplicate={handleDuplicatePreset}
                onDelete={handleDeletePreset}
              />
            ))}
          </div>
          {filteredBuiltIn.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No built-in presets match your search.
            </p>
          )}
        </div>

        {/* Custom Presets */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Custom Presets</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredCustom.map((preset) => (
              <PresetCard
                key={preset.id}
                preset={preset}
                onRun={handleRunPreset}
                onEdit={handleEditPreset}
                onDuplicate={handleDuplicatePreset}
                onDelete={handleDeletePreset}
              />
            ))}
            {/* Create New Card */}
            <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer group">
              <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
                  <Plus className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <p className="font-medium text-foreground">Create Custom Preset</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Save your report configuration
                </p>
              </CardContent>
            </Card>
          </div>
          {filteredCustom.length === 0 && searchQuery && (
            <p className="text-center text-muted-foreground py-8">
              No custom presets match your search.
            </p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

interface PresetCardProps {
  preset: Preset;
  onRun: (preset: Preset) => void;
  onEdit: (preset: Preset) => void;
  onDuplicate: (preset: Preset) => void;
  onDelete: (preset: Preset) => void;
}

function PresetCard({ preset, onRun, onEdit, onDuplicate, onDelete }: PresetCardProps) {
  const Icon = preset.icon;

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
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
              {preset.isCustom && (
                <DropdownMenuItem onClick={() => onEdit(preset)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onDuplicate(preset)}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              {preset.isCustom && (
                <DropdownMenuItem
                  onClick={() => onDelete(preset)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
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
        {preset.isCustom && preset.createdBy && (
          <p className="text-xs text-muted-foreground mt-3">
            Created by {preset.createdBy}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
