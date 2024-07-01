import React from "react";

import { PublicKey } from "@solana/web3.js";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { useMrgnlendStore, useUiStore } from "~/store";
import { cn } from "~/utils";

import { CommandEmpty, CommandGroup, CommandItem } from "~/components/ui/command";
import { BuyWithMoonpay, ActionBoxItem } from "~/components/common/ActionBox/components";

import { TokenListCommand } from "../../SharedComponents";

type RepayCollatTokensListProps = {
  selectedRepayBank: ExtendedBankInfo | null;
  onSetSelectedRepayBank: (selectedTokenBank: ExtendedBankInfo | null) => void;
  blacklistRepayTokens?: PublicKey[];
  isOpen: boolean;
  onClose: () => void;
};

export const RepayCollatTokensList = ({
  selectedRepayBank,
  onSetSelectedRepayBank,
  blacklistRepayTokens = [],
  isOpen,
  onClose,
}: RepayCollatTokensListProps) => {
  const [extendedBankInfos, nativeSolBalance] = useMrgnlendStore((state) => [
    state.extendedBankInfos,
    state.nativeSolBalance,
  ]);
  //const [lendingMode] = useUiStore((state) => [state.lendingMode, state.setIsWalletOpen]);
  const [searchQuery, setSearchQuery] = React.useState("");

  const hasTokens = React.useMemo(() => {
    const hasBankTokens = !!extendedBankInfos.filter(
      (bank) => bank.userInfo.tokenAccount.balance !== 0 || bank.meta.tokenSymbol === "SOL"
    );
    return hasBankTokens;
  }, [extendedBankInfos]);

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
    return extendedBankInfos
      .filter(searchFilter)
      .filter((bankInfo) => positionFilter(bankInfo))
      .sort((a, b) => (b.isActive ? b?.position?.amount : 0) - (a.isActive ? a?.position?.amount : 0));
  }, [extendedBankInfos, searchFilter, positionFilter]);

  React.useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  return (
    <>
      <TokenListCommand selectedBank={selectedRepayBank} onClose={onClose} onSetSearchQuery={setSearchQuery}>
        {!hasTokens && <BuyWithMoonpay />}
        <CommandEmpty>No tokens found.</CommandEmpty>
        {/* REPAYING */}
        {filteredBanksActive.length > 0 && onSetSelectedRepayBank && (
          <CommandGroup heading="Currently supplying">
            {filteredBanksActive.map((bank, index) => {
              const isRouteEnabled = blacklistRepayTokens.find((v) => v.equals(bank.info.state.mint)) ? false : true;
              return (
                <CommandItem
                  key={index}
                  value={bank.address?.toString().toLowerCase()}
                  disabled={!isRouteEnabled}
                  onSelect={(currentValue) => {
                    onSetSelectedRepayBank(
                      extendedBankInfos.find(
                        (bankInfo) => bankInfo.address.toString().toLowerCase() === currentValue
                      ) ?? null
                    );
                    onClose();
                  }}
                  className={cn(
                    "cursor-pointer font-medium flex items-center justify-between gap-2 data-[selected=true]:bg-background-gray-light data-[selected=true]:text-white py-2",
                    isRouteEnabled ? "opacity-100" : "opacity-50 pointer-events-none"
                  )}
                >
                  <ActionBoxItem
                    //lendingMode={lendingMode}
                    bank={bank}
                    showBalanceOverride={false}
                    nativeSolBalance={nativeSolBalance}
                    isRepay={true}
                    available={isRouteEnabled}
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
