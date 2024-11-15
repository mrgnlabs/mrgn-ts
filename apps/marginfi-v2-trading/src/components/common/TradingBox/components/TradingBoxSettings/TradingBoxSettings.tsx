import React from "react";

import { IconArrowLeft } from "@tabler/icons-react";

import { Slippage } from "./components";

type TradingBoxSettingsProps = {
  toggleSettings: (mode: boolean) => void;
  slippageBps: number;
  setSlippageBps: (value: number) => void;
};

export const TradingBoxSettings = ({ toggleSettings, slippageBps, setSlippageBps }: TradingBoxSettingsProps) => {
  return (
    <div className="space-y-6">
      <button className="flex items-center gap-1.5 text-sm" onClick={() => toggleSettings(false)}>
        <IconArrowLeft size={18} /> Back to trading
      </button>
      <div>
        <Slippage toggleSettings={toggleSettings} slippageBps={slippageBps} setSlippageBps={setSlippageBps} />
      </div>
    </div>
  );
};
