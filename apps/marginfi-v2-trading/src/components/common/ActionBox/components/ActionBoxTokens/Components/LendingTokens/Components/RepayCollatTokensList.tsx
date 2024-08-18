import React from "react";

import { PublicKey } from "@solana/web3.js";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { useMrgnlendStore, useTradeStore, useUiStore } from "~/store";
import { cn } from "~/utils";

import { CommandEmpty, CommandGroup, CommandItem } from "~/components/ui/command";
import { BuyWithMoonpay, ActionBoxItem } from "~/components/common/ActionBox/components";

import { TokenListCommand } from "../../SharedComponents";
import { GroupData } from "~/store/tradeStore";

type RepayCollatTokensListProps = {
  selectedRepayBank: ExtendedBankInfo | null;
  activeGroup: GroupData | null;
  onSetSelectedRepayBank: (selectedTokenBank: ExtendedBankInfo | null) => void;
  isOpen: boolean;
  onClose: () => void;
  tokensOverride?: ExtendedBankInfo[];
};

export const RepayCollatTokensList = ({
  selectedRepayBank,
  onSetSelectedRepayBank,
  activeGroup,
  isOpen,
  onClose,
  tokensOverride,
}: RepayCollatTokensListProps) => {
  const [nativeSolBalance] = useMrgnlendStore((state) => [state.nativeSolBalance]);

  //const [lendingMode] = useUiStore((state) => [state.lendingMode, state.setIsWalletOpen]);
  const [searchQuery, setSearchQuery] = React.useState("");

  const extendedBankInfos = React.useMemo(() => {
    return tokensOverride
      ? tokensOverride
      : activeGroup
      ? [...activeGroup.pool.quoteTokens, activeGroup.pool.token]
      : [];
  }, [activeGroup, tokensOverride]);

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
        <CommandEmpty>No tokens found.</CommandEmpty>
        {/* REPAYING */}
        {filteredBanksActive.length > 0 && onSetSelectedRepayBank && (
          <CommandGroup heading="Currently supplying">
            {filteredBanksActive.map((bank, index) => {
              return (
                <CommandItem
                  key={index}
                  value={bank.address?.toString().toLowerCase()}
                  onSelect={(currentValue) => {
                    onSetSelectedRepayBank(
                      extendedBankInfos.find(
                        (bankInfo) => bankInfo.address.toString().toLowerCase() === currentValue
                      ) ?? null
                    );
                    onClose();
                  }}
                  className={cn(
                    "cursor-pointer font-medium flex items-center justify-between gap-2 data-[selected=true]:bg-accent py-2"
                  )}
                >
                  <ActionBoxItem
                    //lendingMode={lendingMode}
                    bank={bank}
                    showBalanceOverride={false}
                    nativeSolBalance={nativeSolBalance}
                    isRepay={true}
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
