import React from "react";

import { Slippage } from "./components";

type TradingBoxSettingsProps = {
  toggleSettings: (mode: boolean) => void;
  slippageBps: number;
  setSlippageBps: (value: number) => void;
};

export const TradingBoxSettings = ({ toggleSettings, slippageBps, setSlippageBps }: TradingBoxSettingsProps) => {
  return (
    <div className="space-y-6">
      <div>
        <Slippage toggleSettings={toggleSettings} slippageBps={slippageBps} setSlippageBps={setSlippageBps} />
      </div>
    </div>
  );
};
