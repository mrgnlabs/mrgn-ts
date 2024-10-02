import React from "react";

import { MarginfiAccountWrapper, MarginRequirementType } from "@mrgnlabs/marginfi-client-v2";

import { ActionSummary } from "~/components/action-box-v2/utils";
import { ActionProgressBar } from "~/components/action-box-v2/components";
import { cn } from "@mrgnlabs/mrgn-utils";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

interface LeverageSliderProps {
  selectedBank: ExtendedBankInfo | null;
  selectedSecondaryBank: ExtendedBankInfo | null;
  amountRaw: string;
  leverageAmount: number;
  setLeverageAmount: (amount: number) => void;
  maxLeverage: number;
}

export const LeverageSlider = ({
  selectedBank,
  selectedSecondaryBank,
  amountRaw,
  leverageAmount,
  setLeverageAmount,
  maxLeverage,
}: LeverageSliderProps) => {
  const bothBanksSelected = React.useMemo(
    () => Boolean(selectedBank && selectedSecondaryBank),
    [selectedBank, selectedSecondaryBank]
  );

  return (
    <>
      <div
        className={cn(
          "space-y-6 py-4 px-1",
          (!bothBanksSelected || !amountRaw) && "pointer-events-none cursor-default opacity-50"
        )}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-normal text-muted-foreground">Loop ➰</p>
          </div>
          {/* <Slider
            defaultValue={[1]}
            max={maxLeverage === 0 ? 1 : maxLeverage}
            min={1}
            step={0.01}
            value={[leverageAmount]}
            onValueChange={(value) => {
              if (value[0] > maxLeverage || value[0] <= 1) return;
              setLeverageAmount(value[0]);
            }}
            disabled={!bothBanksSelected || !amountRaw}
          /> */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-normal text-muted-foreground">
              {leverageAmount > 1 && `${leverageAmount.toFixed(2)}x leverage`}
            </p>
            <span className="flex items-center gap-1">
              <span className="text-muted-foreground text-sm">
                {maxLeverage.toFixed(2)}x
                <button
                  disabled={!!!maxLeverage}
                  className="ml-1 text-xs cursor-pointer text-chartreuse border-b border-transparent transition hover:border-chartreuse"
                  onClick={() => setLeverageAmount(Number(maxLeverage))}
                >
                  MAX
                </button>
              </span>
            </span>
          </div>
        </div>
        {/* {bothBanksSelected && netApy && (
          <div className="flex items-center justify-between">
            <Popover>
              <PopoverTrigger className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
                Net APY <IconChevronDown size={16} />
              </PopoverTrigger>
              <PopoverContent align="center" className="w-auto min-w-52">
                {bothBanksSelected && selectedBank && selectedRepayBank && (
                  <>
                    <ul className="text-xs space-y-2.5">
                      {[selectedBank, selectedRepayBank].map((bank, index) => {
                        const isDepositBank = index === 0;
                        return (
                          <>
                            <li key={bank.meta.tokenSymbol} className="flex items-center gap-8 justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <Image
                                  src={getTokenImageURL(bank.meta.tokenSymbol)}
                                  width={16}
                                  height={16}
                                  alt={bank.meta.tokenName}
                                  className="rounded-full"
                                />
                                <strong className="font-medium">{bank.meta.tokenSymbol}</strong>
                              </div>
                              <span className={cn("ml-auto", isDepositBank ? "text-success" : "text-warning")}>
                                {percentFormatter.format(
                                  isDepositBank ? depositTokenApy.tokenApy : borrowTokenApy.tokenApy
                                )}
                              </span>
                            </li>

                            {isDepositBank && isDepositingLst && (
                              <li className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Image
                                    src={getTokenImageURL(bank.meta.tokenSymbol)}
                                    width={16}
                                    height={16}
                                    alt={bank.meta.tokenName}
                                    className="rounded-full"
                                  />
                                  <div>
                                    <strong className="font-medium">{bank.meta.tokenSymbol}</strong> stake yield
                                  </div>
                                </div>
                                <span className="text-success text-right">
                                  {percentFormatter.format(depositTokenApy.lstApy)}
                                </span>
                              </li>
                            )}

                            {!isDepositBank && isBorrowingLst && (
                              <li className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Image
                                    src={getTokenImageURL(bank.meta.tokenSymbol)}
                                    width={16}
                                    height={16}
                                    alt={bank.meta.tokenName}
                                    className="rounded-full"
                                  />
                                  <div>
                                    <strong className="font-medium">{bank.meta.tokenSymbol}</strong> stake yield
                                  </div>
                                </div>
                                <span className="text-warning text-right">
                                  {percentFormatter.format(borrowTokenApy.lstApy)}
                                </span>
                              </li>
                            )}
                          </>
                        );
                      })}
                    </ul>
                  </>
                )}
              </PopoverContent>
            </Popover>
            <span className={cn("text-xs", netApyRaw < 0 ? "text-warning" : "text-success")}>{netApy} APY</span>
          </div>
        )} */}
      </div>
    </>
  );
};
