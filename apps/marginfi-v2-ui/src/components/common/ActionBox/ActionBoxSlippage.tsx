import React from "react";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { useUiStore } from "~/store";
import { cn } from "~/utils";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { IconInfoCircle, IconArrowLeft } from "~/components/ui/icons";

type ActionBoxSlippageProps = {
  mode: ActionType;
  setIsPriorityFeesMode: (value: boolean) => void;
};

const DEFAULT_SLIPPAGE_BPS = 100;

const priorityFeeOptions = [
  {
    label: "Low",
    value: 100,
  },
  {
    label: "Normal",
    value: 500,
  },
  {
    label: "High",
    value: 1000,
  },
];

export const ActionBoxSlippage = ({ mode, setIsPriorityFeesMode }: ActionBoxSlippageProps) => {
  const [priorityFee, setPriorityFee] = useUiStore((state) => [state.priorityFee, state.setPriorityFee]);
  const [selectedSlippage, setSelectedSlippage] = React.useState<number | null>(DEFAULT_SLIPPAGE_BPS);

  const slippageRef = React.useRef<HTMLInputElement>(null);
  const [isCustomPriorityFeeMode, setIsCustomPriorityFeeMode] = React.useState<boolean>(false);
  const [customSlippage, setCustomSlippage] = React.useState<number | null>(null);

  const modeLabel = React.useMemo(() => {
    let label = "";

    if (mode === ActionType.Deposit) {
      label = "to lending";
    } else if (mode === ActionType.Borrow) {
      label = "to borrowing";
    }

    return label;
  }, [mode]);

  return (
    <div className="space-y-6">
      <button className="flex items-center gap-1.5 text-sm" onClick={() => setIsPriorityFeesMode(false)}>
        <IconArrowLeft size={18} /> Back {modeLabel}
      </button>
      <h2 className="text-lg font-normal mb-2 flex items-center gap-2">
        Set transaction priority{" "}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <IconInfoCircle size={16} />
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-2">
                <p>Priority fees are paid to the Solana network.</p>
                <p>This additional fee helps boost how a transaction is prioritized.</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </h2>
      <ul className="grid grid-cols-3 gap-3 mb-6">
        {priorityFeeOptions.map((option) => (
          <li key={option.value}>
            <Button
              className={cn(
                "flex flex-col gap-0.5 h-auto w-full font-light border border-transparent bg-background/50 transition-colors hover:bg-background-gray-hover",
                selectedSlippage === option.value &&
                  customSlippage === null &&
                  "bg-background-gray-hover border-chartreuse"
              )}
              variant="secondary"
              onClick={() => {
                setSelectedSlippage(option.value);
                setCustomSlippage(null);
                setIsCustomPriorityFeeMode(false);
              }}
            >
              {option.label} <strong className="font-medium">{option.value} SOL</strong>
            </Button>
          </li>
        ))}
      </ul>
      <h2 className="font-normal mb-2">or set manually</h2>
      <div className="relative mb-6">
        <Input
          ref={slippageRef}
          type="number"
          className={cn(
            "h-auto bg-background/50 py-3 px-4 border border-transparent text-white transition-colors focus-visible:ring-0",
            selectedSlippage !== 100 && selectedSlippage !== 500 && selectedSlippage !== 1000 && "border-chartreuse"
          )}
          value={customSlippage && !isCustomPriorityFeeMode ? customSlippage?.toString() : undefined}
          min={0}
          placeholder={
            selectedSlippage !== 100 && selectedSlippage !== 500 && selectedSlippage !== 1000
              ? priorityFee.toString()
              : "0"
          }
          onFocus={() => setIsCustomPriorityFeeMode(true)}
          onChange={() => setCustomSlippage(parseFloat(slippageRef.current?.value || "0"))}
        />
        <span className="absolute inset-y-0 right-3 text-sm flex items-center">SOL</span>
      </div>
      <Button
        onClick={() => {
          if (customSlippage) {
            setPriorityFee(customSlippage);
          } else if (selectedSlippage !== null) {
            setPriorityFee(selectedSlippage);
          }
          setIsPriorityFeesMode(false);
        }}
        className="w-full py-6"
      >
        Save Settings
      </Button>
    </div>
  );
};
