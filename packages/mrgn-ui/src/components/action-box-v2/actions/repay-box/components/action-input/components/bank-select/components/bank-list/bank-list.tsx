import React from "react";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { cn } from "@mrgnlabs/mrgn-utils";

import { CommandEmpty, CommandGroup, CommandItem } from "~/components/ui/command";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, TooltipPortal } from "~/components/ui/tooltip";

import { BankItem, BankListCommand } from "~/components/action-box-v2/components";
import { IconInfoCircle } from "@tabler/icons-react";

type BankListProps = {
  selectedBank: ExtendedBankInfo | null;
  selectedSecondaryBank: ExtendedBankInfo | null;
  banks: ExtendedBankInfo[];
  nativeSolBalance: number;
  isOpen: boolean;

  onSetSelectedSecondaryBank: (selectedTokenBank: ExtendedBankInfo | null) => void;
  onClose: () => void;
};

export const BankList = ({
  selectedBank,
  selectedSecondaryBank,
  banks,
  nativeSolBalance,
  isOpen,

  onSetSelectedSecondaryBank,
  onClose,
}: BankListProps) => {
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

  /////// Supplied BANKS
  // active position banks
  const filteredBanksActive = React.useMemo(() => {
    return banks
      .filter(searchFilter)
      .filter((bankInfo) => bankInfo.isActive)
      .filter(
        (bankInfo) => bankInfo.position.isLending || bankInfo.address.toBase58() === selectedBank?.address.toBase58()
      )
      .filter((bankInfo) => bankInfo.info.rawBank.config.assetTag !== 2)
      .sort((a, b) => (b.isActive ? b?.position?.usdValue : 0) - (a.isActive ? a?.position?.usdValue : 0));
  }, [banks, searchFilter, selectedBank]);

  React.useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  return (
    <>
      <BankListCommand selectedBank={selectedSecondaryBank} onClose={onClose} onSetSearchQuery={setSearchQuery}>
        {!hasTokens && (
          <div className="text-sm text-[#C0BFBF] font-normal p-3">
            You don&apos;t own any supported tokens in marginfi. Check out what marginfi supports.
          </div>
        )}
        <CommandEmpty>No tokens found.</CommandEmpty>

        {selectedBank && selectedBank.userInfo.tokenAccount.balance > 0 && (
          <CommandGroup heading="Current position">
            <CommandItem
              key={selectedBank.address?.toString().toLowerCase()}
              value={selectedBank.address?.toString().toLowerCase()}
              onSelect={(currentValue) => {
                onSetSelectedSecondaryBank(
                  banks.find((bankInfo) => bankInfo.address.toString().toLowerCase() === currentValue) ?? null
                );
                onClose();
              }}
              className={cn(
                "cursor-pointer font-medium flex items-center justify-between gap-2 data-[selected=true]:bg-mfi-action-box-accent data-[selected=true]:text-mfi-action-box-accent-foreground py-2",
                "opacity-100"
              )}
            >
              <BankItem
                bank={selectedBank}
                showBalanceOverride={true}
                nativeSolBalance={nativeSolBalance}
                isRepay={false}
                available={true}
              />
            </CommandItem>
          </CommandGroup>
        )}

        {/* REPAYING */}
        {filteredBanksActive.length > 0 && (
          <CommandGroup
            heading={
              <div className="flex items-center gap-1.5 cursor-default">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <IconInfoCircle size={14} className="hidden md:block" />
                    </TooltipTrigger>
                    <TooltipPortal>
                      <TooltipContent>
                        <p>Use your supplied assets to repay your borrow</p>
                      </TooltipContent>
                    </TooltipPortal>
                  </Tooltip>
                </TooltipProvider>
                <p>Collateral Repay</p>
              </div>
            }
          >
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
                    "cursor-pointer font-medium flex items-center justify-between gap-2 data-[selected=true]:bg-mfi-action-box-accent data-[selected=true]:text-mfi-action-box-accent-foreground py-2",
                    "opacity-100"
                  )}
                >
                  <BankItem
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
      </BankListCommand>
    </>
  );
};
