"use client";

import { FileSearch } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onBuildReport?: () => void;
}

export function EmptyState({ onBuildReport }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-6">
        <FileSearch className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        No results to display
      </h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        Configure your report filters and click Generate to see results here.
        You can also load a saved preset to get started quickly.
      </p>
      {onBuildReport && (
        <Button
          onClick={onBuildReport}
          className="bg-gradient-to-r from-primary to-accent text-primary-foreground"
        >
          Build a Report
        </Button>
      )}
    </div>
  );
}
