"use client";

import * as React from "react";
import { GripVertical, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type GroupingOption =
  | "lender"
  | "status"
  | "retailer"
  | "bdm"
  | "month"
  | "week"
  | "product";

const groupingLabels: Record<GroupingOption, string> = {
  lender: "Lender",
  status: "Status",
  retailer: "Retailer",
  bdm: "BDM",
  month: "Month",
  week: "Week",
  product: "Product",
};

interface GroupingSectionProps {
  selected: GroupingOption[];
  onChange: (selected: GroupingOption[]) => void;
}

export function GroupingSection({ selected, onChange }: GroupingSectionProps) {
  const availableOptions = (
    Object.keys(groupingLabels) as GroupingOption[]
  ).filter((option) => !selected.includes(option));

  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null) {
      const newSelected = [...selected];
      const [removed] = newSelected.splice(draggedIndex, 1);
      newSelected.splice(dragOverIndex, 0, removed);
      onChange(newSelected);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleAdd = (option: GroupingOption) => {
    onChange([...selected, option]);
  };

  const handleRemove = (option: GroupingOption) => {
    onChange(selected.filter((item) => item !== option));
  };

  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="text-foreground">Group By</CardTitle>
        <p className="text-sm text-muted-foreground">
          Select and reorder how data should be grouped
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selected.map((option, index) => (
              <div
                key={option}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 text-primary border border-primary/20 cursor-grab active:cursor-grabbing transition-all",
                  draggedIndex === index && "opacity-50",
                  dragOverIndex === index && "ring-2 ring-primary"
                )}
              >
                <GripVertical className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {index + 1}. {groupingLabels[option]}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(option)}
                  className="ml-1 hover:text-destructive transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {availableOptions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {availableOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleAdd(option)}
                className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
              >
                + {groupingLabels[option]}
              </button>
            ))}
          </div>
        )}

        {selected.length === 0 && (
          <p className="text-sm text-muted-foreground italic">
            Click options above to add grouping levels
          </p>
        )}
      </CardContent>
    </Card>
  );
}
