import React from "react";
import { useUiStore } from "~/store";

interface PortfolioHeaderProps {
  netValue?: string;
  points?: string;
}

export const PortfolioHeader = ({ netValue, points }: PortfolioHeaderProps) => {
  const [setLendingMode] = useUiStore((state) => [state.setLendingMode]);

  return (
    <div>
      <div className="text-center">
        <h2 className="text-3xl">Portfolio</h2>
        <p className="text-muted-foreground">Check and manage all your positions in marginfi</p>
      </div>
    </div>
  );
};
