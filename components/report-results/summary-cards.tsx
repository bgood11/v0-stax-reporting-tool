"use client";

import { Card, CardContent } from "@/components/ui/card";
import { FileText, DollarSign, TrendingUp, CheckCircle } from "lucide-react";

export interface SummaryData {
  totalRecords: number;
  totalLoanValue: number;
  totalCommission: number;
  approvalRate: number;
}

interface SummaryCardsProps {
  data: SummaryData;
}

export function SummaryCards({ data }: SummaryCardsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-GB").format(value);
  };

  const cards = [
    {
      title: "Total Records",
      value: formatNumber(data.totalRecords),
      icon: FileText,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Total Loan Value",
      value: formatCurrency(data.totalLoanValue),
      icon: DollarSign,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Total Commission",
      value: formatCurrency(data.totalCommission),
      icon: TrendingUp,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Approval Rate",
      value: `${data.approvalRate}%`,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div
                className={`h-12 w-12 rounded-xl ${card.bgColor} flex items-center justify-center`}
              >
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="text-2xl font-bold text-foreground">
                  {card.value}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
