import React from "react";
import { useUiStore } from "~/store";

interface PortfolioHeaderProps {
  netValue?: string;
  points?: string;
}

export const PortfolioHeader = ({ netValue, points }: PortfolioHeaderProps) => {
  return (
    <div>
      <div className="text-center mt-5 mb-12">
        <h2 className="text-3xl">Portfolio</h2>
        <p className="text-muted-foreground">Check and manage all your positions in marginfi</p>
      </div>
    </div>
  );
};
