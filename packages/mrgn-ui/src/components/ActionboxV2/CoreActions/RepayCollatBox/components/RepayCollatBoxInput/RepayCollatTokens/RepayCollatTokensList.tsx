import React from "react";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { CommandEmpty, CommandGroup, CommandItem } from "~/components/ui/command";
import { ActionBoxItem, TokenListCommand } from "~/components/ActionboxV2/sharedComponents";
import { BuyWithMoonpay } from "~/components/ui/icons";
import { cn } from "~/utils/themeUtils";

type RepayCollatTokensListProps = {
  selectedSecondaryBank: ExtendedBankInfo | null;
  banks: ExtendedBankInfo[];
  nativeSolBalance: number;
  isOpen: boolean;

  onSetSelectedSecondaryBank: (selectedTokenBank: ExtendedBankInfo | null) => void;
  onClose: () => void;
};

export const RepayCollatTokensList = ({
  selectedSecondaryBank,
  banks,
  nativeSolBalance,
  isOpen,

  onSetSelectedSecondaryBank,
  onClose,
}: RepayCollatTokensListProps) => {
  const [searchQuery, setSearchQuery] = React.useState("");

  const hasTokens = React.useMemo(() => {
    const hasBankTokens = !!banks.filter(
      (bank) => bank.userInfo.tokenAccount.balance !== 0 || bank.meta.tokenSymbol === "SOL"
    );
    return hasBankTokens;
  }, [banks]);

  /////// FILTERS
  // filter on search
  const searchFilter = React.useCallback(
    (bankInfo: ExtendedBankInfo) => {
      const lowerCaseSearchQuery = searchQuery.toLowerCase();
      return bankInfo.meta.tokenSymbol.toLowerCase().includes(lowerCaseSearchQuery);
    },
    [searchQuery]
  );

  // filter on positions
  const positionFilter = React.useCallback((bankInfo: ExtendedBankInfo) => {
    return bankInfo.isActive && bankInfo.position.isLending;
  }, []);

  /////// BANKS
  // active position banks
  const filteredBanksActive = React.useMemo(() => {
    return banks
      .filter(searchFilter)
      .filter((bankInfo) => positionFilter(bankInfo))
      .sort((a, b) => (b.isActive ? b?.position?.amount : 0) - (a.isActive ? a?.position?.amount : 0));
  }, [banks, searchFilter, positionFilter]);

  React.useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  return (
    <>
      <TokenListCommand selectedBank={selectedSecondaryBank} onClose={onClose} onSetSearchQuery={setSearchQuery}>
        {!hasTokens && <BuyWithMoonpay />}
        <CommandEmpty>No tokens found.</CommandEmpty>
        {/* REPAYING */}
        {filteredBanksActive.length > 0 && (
          <CommandGroup heading="Currently supplying">
            {filteredBanksActive.map((bank, index) => {
              return (
                <CommandItem
                  key={index}
                  value={bank.address?.toString().toLowerCase()}
                  onSelect={(currentValue) => {
                    onSetSelectedSecondaryBank(
                      banks.find((bankInfo) => bankInfo.address.toString().toLowerCase() === currentValue) ?? null
                    );
                    onClose();
                  }}
                  className={cn(
                    "cursor-pointer font-medium flex items-center justify-between gap-2 data-[selected=true]:bg-background-gray-light data-[selected=true]:text-white py-2",
                    "opacity-100"
                  )}
                >
                  <ActionBoxItem
                    bank={bank}
                    showBalanceOverride={false}
                    nativeSolBalance={nativeSolBalance}
                    isRepay={true}
                    available={true}
                  />
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
      </TokenListCommand>
    </>
  );
};
