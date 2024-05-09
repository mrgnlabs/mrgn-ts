import React from "react";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { useActionBoxStore } from "~/hooks/useActionBoxStore";

import { ActionBoxTokens } from "~/components/common/ActionBox/components";

import { Input } from "~/components/ui/input";
import { Slider } from "~/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { IconChevronDown } from "~/components/ui/icons";

type LoopInputProps = {
  handleInputChange: (value: string) => void;
  handleInputFocus: (focus: boolean) => void;
};

export const LoopInput = ({ handleInputChange, handleInputFocus }: LoopInputProps) => {
  const amountInputRef = React.useRef<HTMLInputElement>(null);
  const [setSelectedBank, setRepayBank, setSelectedStakingAccount, amountRaw] = useActionBoxStore()((state) => [
    state.setSelectedBank,
    state.setRepayBank,
    state.setSelectedStakingAccount,
    state.amountRaw,
  ]);

  const [leveragedAmount, setLeveragedAmount] = React.useState(0);

  return (
    <div>
      <div className="bg-background rounded-lg p-2.5 mb-6">
        <div className="flex justify-center gap-1 items-center font-medium text-3xl">
          <div className="w-full flex-auto max-w-[162px]">
            <ActionBoxTokens
              actionModeOverride={ActionType.Deposit}
              setRepayTokenBank={(tokenBank) => {
                setRepayBank(tokenBank);
              }}
              setTokenBank={(tokenBank) => {
                setSelectedBank(tokenBank);
              }}
              setStakingAccount={(account) => {
                setSelectedStakingAccount(account);
              }}
            />
          </div>
          <div className="flex-auto">
            <Input
              type="text"
              ref={amountInputRef}
              inputMode="decimal"
              value={amountRaw}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => handleInputFocus(true)}
              onBlur={() => handleInputFocus(false)}
              placeholder="0"
              className="bg-transparent min-w-[130px] text-right outline-none focus-visible:outline-none focus-visible:ring-0 border-none text-base font-medium"
            />
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-normal text-muted-foreground">You borrow</p>
        <div className="bg-background rounded-lg p-2.5 mb-6">
          <div className="flex justify-center gap-1 items-center font-medium text-3xl">
            <div className="w-full flex-auto max-w-[162px]">
              <ActionBoxTokens
                actionModeOverride={ActionType.Borrow}
                setRepayTokenBank={(tokenBank) => {
                  setRepayBank(tokenBank);
                }}
                setTokenBank={(tokenBank) => {
                  setSelectedBank(tokenBank);
                }}
                setStakingAccount={(account) => {
                  setSelectedStakingAccount(account);
                }}
              />
            </div>
            <div className="flex-auto">
              <Input
                type="text"
                ref={amountInputRef}
                inputMode="decimal"
                value={amountRaw}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => handleInputFocus(true)}
                onBlur={() => handleInputFocus(false)}
                placeholder="0"
                className="bg-transparent min-w-[130px] text-right outline-none focus-visible:outline-none focus-visible:ring-0 border-none text-base font-medium"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-6 py-4 px-1">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p>Loop ➰</p>
            <span className="flex items-center gap-1">
              {leveragedAmount > 1 && (
                <span className="text-muted-foreground text-sm">{leveragedAmount}x leverage</span>
              )}
              {leveragedAmount > 5 && "🔥"}
              {leveragedAmount >= 8 && "🔥"}
              {leveragedAmount >= 10 && "🔥"}
            </span>
          </div>
          <Slider
            defaultValue={[1]}
            max={10}
            min={1}
            step={1}
            value={[leveragedAmount]}
            onValueChange={(value) => setLeveragedAmount(value[0])}
            className="w-full"
          />
        </div>
        <div className="flex items-center justify-between">
          <Popover>
            <PopoverTrigger className="flex items-center gap-2">
              Net APY <IconChevronDown size={16} />
            </PopoverTrigger>
            <PopoverContent>APY Breakdown goes here</PopoverContent>
          </Popover>
          <span>9%</span>
        </div>
      </div>
    </div>
  );
};
