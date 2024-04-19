import React from "react";

import { PublicKey } from "@solana/web3.js";

import { percentFormatter, aprToApy } from "@mrgnlabs/mrgn-common";
import { ExtendedBankInfo, Emissions } from "@mrgnlabs/marginfi-v2-ui-state";

import { LendingModes } from "~/types";
import { useMrgnlendStore, useUiStore } from "~/store";
import { cn } from "~/utils";

import { CommandEmpty, CommandGroup, CommandItem } from "~/components/ui/command";

import { ActionBoxItem, BuyWithMoonpay, TokenListCommand } from "../../SharedComponents";

const SUPPORTED_LST = ["LST", "JitoSOL", "mSOL", "bSOL"];

type YbxTokensListListProps = {
  selectedRepayBank: ExtendedBankInfo | null;
  blacklistRepayTokens?: PublicKey[];
  isOpen: boolean;
  onClose: () => void;
};

export const YbxTokensList = ({
  selectedRepayBank,
  blacklistRepayTokens = [],
  isOpen,
  onClose,
}: YbxTokensListListProps) => {
  const [extendedBankInfos, nativeSolBalance] = useMrgnlendStore((state) => [
    state.extendedBankInfos,
    state.nativeSolBalance,
  ]);
  const [lendingMode] = useUiStore((state) => [state.lendingMode, state.setIsWalletOpen]);
  const [searchQuery, setSearchQuery] = React.useState("");

  const hasTokens = React.useMemo(() => {
    const hasBankTokens = !!extendedBankInfos.filter(
      (bank) => bank.userInfo.tokenAccount.balance !== 0 || bank.meta.tokenSymbol === "SOL"
    );

    return hasBankTokens;
  }, [extendedBankInfos]);

  /////// FILTERS
  // filter on search
  const lstFilter = React.useCallback(
    (bankInfo: ExtendedBankInfo) => SUPPORTED_LST.includes(bankInfo.meta.tokenSymbol),
    []
  );

  // filter on positions
  const positionFilter = React.useCallback(
    (bankInfo: ExtendedBankInfo) => bankInfo.isActive && bankInfo.position.isLending,
    []
  );

  /////// BANKS
  // active position banks
  const filteredBanksActive = React.useMemo(() => {
    return extendedBankInfos
      .filter(lstFilter)
      .filter(positionFilter)
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
                    lendingMode={lendingMode}
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
