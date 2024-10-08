import React from "react";

import { IconInfoCircle } from "@tabler/icons-react";
import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { cn } from "@mrgnlabs/mrgn-utils";

import { useUiStore } from "~/store";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

type ActionBoxPriorityFeesProps = {
  mode: ActionType;
  toggleSettings: (mode: boolean) => void;
};

const priorityFeeOptions = [
  {
    label: "Normal",
    value: 0,
  },
  {
    label: "High",
    value: 0.00005,
  },
  {
    label: "Mamas",
    value: 0.005,
  },
];

export const ActionBoxPriorityFees = ({ mode, toggleSettings }: ActionBoxPriorityFeesProps) => {
  const [priorityFee, setPriorityFee] = useUiStore((state) => [state.priorityFee, state.setPriorityFee]);
  const [selectedPriorityFee, setSelectedPriorityFee] = React.useState<number | null>(priorityFee);

  const priorityFeeRef = React.useRef<HTMLInputElement>(null);
  const [isCustomPriorityFeeMode, setIsCustomPriorityFeeMode] = React.useState<boolean>(false);
  const [customPriorityFee, setCustomPriorityFee] = React.useState<number | null>(null);

  return (
    <div className="space-y-6">
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
      <ul className="grid grid-cols-3 gap-4 mb-6">
        {priorityFeeOptions.map((option) => (
          <li key={option.value}>
            <Button
              className={cn(
                "flex flex-col font-normal gap-1 h-auto w-full border bg-background transition-colors hover:bg-accent",
                selectedPriorityFee === option.value && customPriorityFee === null && "bg-accent"
              )}
              variant="secondary"
              onClick={() => {
                setSelectedPriorityFee(option.value);
                setCustomPriorityFee(null);
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
          ref={priorityFeeRef}
          type="number"
          className={cn(
            "h-auto bg-background py-3 px-4 border transition-colors",
            selectedPriorityFee !== 0.005 && selectedPriorityFee !== 0.00005 && selectedPriorityFee !== 0 && "bg-accent"
          )}
          value={customPriorityFee && !isCustomPriorityFeeMode ? customPriorityFee?.toString() : undefined}
          min={0}
          placeholder={
            selectedPriorityFee !== 0.005 && selectedPriorityFee !== 0.00005 && selectedPriorityFee !== 0
              ? priorityFee.toString()
              : "0"
          }
          onFocus={() => setIsCustomPriorityFeeMode(true)}
          onChange={() => setCustomPriorityFee(parseFloat(priorityFeeRef.current?.value || "0"))}
        />
        <span className="absolute inset-y-0 right-3 text-sm flex items-center">SOL</span>
      </div>
      <Button
        onClick={() => {
          if (customPriorityFee) {
            setPriorityFee(customPriorityFee);
          } else if (selectedPriorityFee !== null) {
            setPriorityFee(selectedPriorityFee);
          }
          toggleSettings(false);
        }}
        className="w-full py-5"
      >
        Save Settings
      </Button>
    </div>
  );
};
