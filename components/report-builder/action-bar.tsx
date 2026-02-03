"use client";

import { Play, Save, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ActionBarProps {
  onGenerate: () => void;
  onSavePreset: () => void;
  onSchedule: () => void;
  isGenerating?: boolean;
  canGenerate?: boolean;
}

export function ActionBar({
  onGenerate,
  onSavePreset,
  onSchedule,
  isGenerating = false,
  canGenerate = true,
}: ActionBarProps) {
  return (
    <div className="sticky bottom-0 z-10 border-t border-border bg-card p-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-7xl mx-auto">
        <p className="text-sm text-muted-foreground hidden sm:block">
          Configure your report above, then generate to see results
        </p>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={onSavePreset}
            className="flex-1 sm:flex-none bg-transparent"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Preset
          </Button>
          <Button
            variant="outline"
            onClick={onSchedule}
            className="flex-1 sm:flex-none bg-transparent"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Schedule
          </Button>
          <Button
            onClick={onGenerate}
            disabled={!canGenerate || isGenerating}
            className="flex-1 sm:flex-none bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90"
          >
            <Play className="h-4 w-4 mr-2" />
            {isGenerating ? "Generating..." : "Generate Report"}
          </Button>
        </div>
      </div>
    </div>
  );
}
