import React from "react";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { useUiStore } from "~/store";
import { cn } from "~/utils";

import { MrgnTooltip } from "~/components/common/MrgnTooltip";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { IconInfoCircle, IconArrowLeft } from "~/components/ui/icons";

type ActionBoxPriorityFeesProps = {
  mode: ActionType;
  setIsPriorityFeesMode: (value: boolean) => void;
};

export const ActionBoxPriorityFees = ({ mode, setIsPriorityFeesMode }: ActionBoxPriorityFeesProps) => {
  const [priorityFee, setPriorityFee] = useUiStore((state) => [state.priorityFee, state.setPriorityFee]);

  const priorityFeeRef = React.useRef<HTMLInputElement>(null);
  const [isCustomPriorityFeeMode, setIsCustomPriorityFeeMode] = React.useState<boolean>(false);
  const [customPriorityFee, setCustomPriorityFee] = React.useState<number | null>(null);

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
        <MrgnTooltip
          title="Priority fees are paid to the Solana network. This additional fee helps boost how a transaction is prioritized."
          placement="right"
        >
          <IconInfoCircle size={16} />
        </MrgnTooltip>
      </h2>
      <ul className="grid grid-cols-3 gap-3 mb-6">
        <li>
          <Button
            className={cn(
              "flex flex-col gap-0.5 h-auto w-full font-light border border-transparent bg-background/50 transition-colors hover:bg-background-gray-hover",
              priorityFee === 0.0 && customPriorityFee === null && "bg-background-gray-hover border-chartreuse"
            )}
            variant="secondary"
            onClick={() => {
              setPriorityFee(0);
              setCustomPriorityFee(null);
              setIsCustomPriorityFeeMode(false);
            }}
          >
            Normal <strong className="font-medium">0 SOL</strong>
          </Button>
        </li>
        <li>
          <Button
            className={cn(
              "flex flex-col gap-0.5 h-auto w-full font-light border border-transparent bg-background/50 transition-colors hover:bg-background-gray-hover",
              priorityFee === 0.00005 && customPriorityFee === null && "bg-background-gray-hover border-chartreuse"
            )}
            variant="secondary"
            onClick={() => {
              setPriorityFee(0.00005);
              setCustomPriorityFee(null);
              setIsCustomPriorityFeeMode(false);
            }}
          >
            High <strong className="font-medium">0.00005 SOL</strong>
          </Button>
        </li>
        <li>
          <Button
            className={cn(
              "flex flex-col gap-0.5 h-auto w-full font-light border border-transparent bg-background/50 transition-colors hover:bg-background-gray-hover",
              priorityFee === 0.005 && customPriorityFee === null && "bg-background-gray-hover border-chartreuse"
            )}
            variant="secondary"
            onClick={() => {
              setPriorityFee(0.005);
              setCustomPriorityFee(null);
              setIsCustomPriorityFeeMode(false);
            }}
          >
            Turbo <strong className="font-medium">0.005 SOL</strong>
          </Button>
        </li>
      </ul>
      <h2 className="font-normal mb-2">or set manually</h2>
      <div className="relative mb-6">
        <Input
          ref={priorityFeeRef}
          type="number"
          className={cn(
            "h-auto bg-background/50 py-3 px-4 border border-transparent text-white transition-colors focus-visible:ring-0",
            priorityFee !== 0.005 && priorityFee !== 0.00005 && priorityFee !== 0 && "border-chartreuse"
          )}
          value={customPriorityFee && !isCustomPriorityFeeMode ? customPriorityFee?.toString() : undefined}
          min={0}
          placeholder={
            priorityFee !== 0.005 && priorityFee !== 0.00005 && priorityFee !== 0 ? priorityFee.toString() : "0"
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
