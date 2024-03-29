import React from "react";
import { useUiStore } from "~/store";

interface PortfolioHeaderProps {
  netValue?: string;
  points?: string;
}

export const PortfolioHeader = ({ netValue, points }: PortfolioHeaderProps) => {
  return (
    <div>
      <div className="text-center pb-8 space-y-2">
        <h1 className="text-4xl font-medium">Portfolio</h1>
        <p className="text-muted-foreground text-xl">Manage your marginfi positions.</p>
      </div>
    </div>
  );
};
