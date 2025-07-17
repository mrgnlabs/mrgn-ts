import React from "react";
import { IconInfoCircle } from "@tabler/icons-react";

import { calcNetLoopingApy, cn } from "@mrgnlabs/mrgn-utils";
import { ExtendedBankInfo } from "@mrgnlabs/mrgn-state";
import { percentFormatter } from "@mrgnlabs/mrgn-common";

import { useDebounce } from "@uidotdev/usehooks";

import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";

type ApyStatProps = {
  selectedBank: ExtendedBankInfo | null;
  selectedSecondaryBank: ExtendedBankInfo | null;
  leverageAmount: number;
  depositLstApy: number | null;
  borrowLstApy: number | null;
};

export const ApyStat = ({
  selectedBank,
  selectedSecondaryBank,
  leverageAmount,
  depositLstApy,
  borrowLstApy,
}: ApyStatProps) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const debouncedIsOpen = useDebounce(isOpen, 100);
  const [apyOverview, setApyOverview] = React.useState<{
    totalDepositApy: number;
    totalBorrowApy: number;
    totalDepositLstApy: number;
    totalBorrowLstApy: number;
    netApyRaw: number;
    netApy: string;
  } | null>(null);

  const updateApyOverview = React.useCallback(
    (bank: ExtendedBankInfo, secondaryBank: ExtendedBankInfo) => {
      const {
        totalDepositApy,
        totalBorrowApy,
        depositLstApy: totalDepositLstApy,
        borrowLstApy: totalBorrowLstApy,
        netApy,
      } = calcNetLoopingApy(bank, secondaryBank, depositLstApy ?? 0, borrowLstApy ?? 0, leverageAmount);

      setApyOverview({
        totalDepositApy,
        totalBorrowApy,
        totalDepositLstApy,
        totalBorrowLstApy,
        netApyRaw: netApy,
        netApy: percentFormatter.format(Math.abs(netApy)),
      });
    },
    [borrowLstApy, depositLstApy, leverageAmount]
  );

  React.useEffect(() => {
    if (!selectedBank || !selectedSecondaryBank) {
      setApyOverview(null);
      return;
    }

    updateApyOverview(selectedBank, selectedSecondaryBank);
  }, [leverageAmount, selectedBank, selectedSecondaryBank, updateApyOverview]);

  const bothBanksSelected = React.useMemo(
    () => Boolean(selectedBank && selectedSecondaryBank),
    [selectedBank, selectedSecondaryBank]
  );

  const onMouseEnter = React.useCallback(() => {
    setIsOpen(true);
  }, []);

  const onMouseLeave = React.useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <>
      {bothBanksSelected && apyOverview && (
        <div className="flex items-center justify-between">
          <Popover open={debouncedIsOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger
              className="flex items-center gap-1 text-xs font-normal text-muted-foreground"
              onMouseEnter={onMouseEnter}
              onMouseLeave={onMouseLeave}
            >
              Net APY <IconInfoCircle size={14} />
            </PopoverTrigger>
            <PopoverContent align="center" className="w-auto min-w-52" onMouseEnter={onMouseEnter}>
              {bothBanksSelected && selectedBank && selectedSecondaryBank && (
                <>
                  <ul className="text-xs space-y-2.5">
                    {[selectedBank, selectedSecondaryBank].map((bank, index) => {
                      const isDepositBank = index === 0;
                      return (
                        <React.Fragment key={bank.meta.tokenSymbol}>
                          <li key={bank.meta.tokenSymbol} className="flex items-center gap-8 justify-between text-xs">
                            <div className="flex items-center gap-2">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={bank.meta.tokenLogoUri}
                                width={16}
                                height={16}
                                alt={bank.meta.tokenName}
                                className="rounded-full"
                              />
                              <strong className="font-medium">{bank.meta.tokenSymbol}</strong>{" "}
                              {isDepositBank ? "lending" : "borrowing"} rate
                            </div>
                            <span className={cn("ml-auto", isDepositBank ? "text-success" : "text-warning")}>
                              {percentFormatter.format(
                                isDepositBank ? apyOverview.totalDepositApy : apyOverview.totalBorrowApy
                              )}
                            </span>
                          </li>

                          {isDepositBank && depositLstApy !== null && depositLstApy > 0 && (
                            <li className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={bank.meta.tokenLogoUri}
                                  width={16}
                                  height={16}
                                  alt={bank.meta.tokenName}
                                  className="rounded-full"
                                />
                                <div>
                                  <strong className="font-medium">{bank.meta.tokenSymbol}</strong> staking rate
                                </div>
                              </div>
                              <span className="text-success text-right">
                                {percentFormatter.format(apyOverview.totalDepositLstApy)}
                              </span>
                            </li>
                          )}

                          {!isDepositBank && borrowLstApy !== null && borrowLstApy > 0 && (
                            <li className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={bank.meta.tokenLogoUri}
                                  width={16}
                                  height={16}
                                  alt={bank.meta.tokenName}
                                  className="rounded-full"
                                />
                                <div>
                                  <strong className="font-medium">{bank.meta.tokenSymbol}</strong> staking rate
                                </div>
                              </div>
                              <span className="text-warning text-right">
                                {percentFormatter.format(apyOverview.totalBorrowLstApy)}
                              </span>
                            </li>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </ul>
                </>
              )}
            </PopoverContent>
          </Popover>
          <span className={cn("text-xs", apyOverview.netApyRaw < 0 ? "text-warning" : "text-success")}>
            {apyOverview.netApy} APY
          </span>
        </div>
      )}
    </>
  );
};
