"use client";

import { FileSearch, AlertCircle, Database, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export type EmptyStateType =
  | "no-data"           // No data in system at all
  | "no-results"        // Filters applied but no matches
  | "no-sync"           // Data hasn't synced yet
  | "error";            // Error loading data

interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

const defaultStates: Record<EmptyStateType, { icon: any; title: string; description: string }> = {
  "no-results": {
    icon: TrendingDown,
    title: "No results found",
    description: "No applications match your filters. Try expanding your date range or clearing some filters to see results.",
  },
  "no-data": {
    icon: Database,
    title: "No application data available",
    description: "No application data has been synced yet. Data syncs automatically at 1am each day.",
  },
  "no-sync": {
    icon: Database,
    title: "Data sync in progress",
    description: "Your application data is being synced from Salesforce. Please check back shortly.",
  },
  "error": {
    icon: AlertCircle,
    title: "Unable to load data",
    description: "An error occurred while loading your data. Please try refreshing the page.",
  },
};

export function EmptyState({
  type = "no-results",
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) {
  const state = defaultStates[type];
  const Icon = state.icon;
  const displayTitle = title || state.title;
  const displayDescription = description || state.description;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-6">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {displayTitle}
      </h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        {displayDescription}
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        {action && (
          <Button
            onClick={action.onClick}
            className="bg-gradient-to-r from-primary to-accent text-primary-foreground"
          >
            {action.label}
          </Button>
        )}
        {secondaryAction && (
          <Button
            onClick={secondaryAction.onClick}
            variant="outline"
          >
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}
