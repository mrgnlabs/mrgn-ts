import React from "react";

import { PublicKey } from "@solana/web3.js";

import { percentFormatter, aprToApy } from "@mrgnlabs/mrgn-common";
import { ExtendedBankInfo, Emissions } from "@mrgnlabs/marginfi-v2-ui-state";

import { LendingModes } from "~/types";
import { useMrgnlendStore, useUiStore } from "~/store";
import { cn } from "~/utils";

import { BuyWithMoonpay, ActionBoxItem } from "~/components/common/ActionBox/components";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "~/components/ui/command";

const SUPPORTED_LST = ["lst", "jitosol", "msol", "bsol"];

type YbxTokensListListProps = {};

export const YbxTokensList = ({}: YbxTokensListListProps) => {
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
    (bankInfo: ExtendedBankInfo) => SUPPORTED_LST.includes(bankInfo.meta.tokenSymbol.toLowerCase()),
    []
  );

  // filter on wallet amount
  const walletFilter = React.useCallback(
    (bankInfo: ExtendedBankInfo) => bankInfo.userInfo.tokenAccount.balance > 0,
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
    return (
      extendedBankInfos
        .filter(lstFilter)
        // .filter(positionFilter)
        .sort((a, b) => (b.isActive ? b?.position?.amount : 0) - (a.isActive ? a?.position?.amount : 0))
    );
  }, [extendedBankInfos, lstFilter, positionFilter]);

  const filteredBanksWallet = React.useMemo(() => {
    return extendedBankInfos
      .filter(lstFilter)
      .filter(positionFilter)
      .sort((a, b) => (b.isActive ? b?.position?.amount : 0) - (a.isActive ? a?.position?.amount : 0));
  }, [extendedBankInfos, lstFilter, positionFilter]);
  return (
    <div>
      {!hasTokens && <BuyWithMoonpay />}
      {/* REPAYING */}
      {filteredBanksActive.length > 0 && (
        <div>
          <p className="text-sm">{`Available (in wallet)`}</p>
          {filteredBanksWallet.map((bank, index) => {
            return (
              <div
                key={index}
                className={cn(
                  "cursor-pointer font-medium flex items-center justify-between gap-2 py-2 cursor-default",
                  "opacity-100",
                  "aria-selected:bg-inherit aria-selected:text-inherit"
                )}
              >
                <ActionBoxItem
                  lendingMode={lendingMode}
                  bank={bank}
                  showBalanceOverride={false}
                  nativeSolBalance={nativeSolBalance}
                  isRepay={true}
                />
              </div>
            );
          })}
        </div>
      )}
      {filteredBanksActive.length > 0 && (
        <div>
          <p className="text-sm">Currently supplying</p>
          {filteredBanksActive.map((bank, index) => {
            return (
              <div
                key={index}
                className={cn(
                  "cursor-pointer font-medium flex items-center justify-between gap-2 py-2 cursor-default",
                  "opacity-100",
                  "aria-selected:bg-inherit aria-selected:text-inherit"
                )}
              >
                <ActionBoxItem
                  lendingMode={lendingMode}
                  bank={bank}
                  showBalanceOverride={false}
                  nativeSolBalance={nativeSolBalance}
                  isRepay={true}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
