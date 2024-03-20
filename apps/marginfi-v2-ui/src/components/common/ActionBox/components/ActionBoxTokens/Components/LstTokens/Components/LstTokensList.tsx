import React from "react";

import { PublicKey } from "@solana/web3.js";

import { WSOL_MINT } from "@mrgnlabs/mrgn-common";
import { getPriceWithConfidence } from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { SOL_MINT } from "~/store/lstStore";
import { LstType } from "~/utils";
import { useLstStore, useMrgnlendStore } from "~/store";
import { useWalletContext } from "~/hooks/useWalletContext";

import { CommandEmpty, CommandGroup, CommandItem } from "~/components/ui/command";

import { ActionBoxItem, BuyWithMoonpay, TokenListCommand } from "../../SharedComponents";
import { ActionBoxNativeItem } from "./ActionBoxNativeItem";
import { CommandList } from "cmdk";

type LstTokenListProps = {
  selectedBank: ExtendedBankInfo | null;
  onSetCurrentTokenBank: (selectedTokenBank: PublicKey | null) => void;
  isDialog?: boolean;
  isOpen: boolean;
  lstType: LstType;
  onClose: () => void;
};

export const LstTokenList = ({ selectedBank, onSetCurrentTokenBank, isOpen, lstType, onClose }: LstTokenListProps) => {
  const [extendedBankInfos, nativeSolBalance] = useMrgnlendStore((state) => [
    state.extendedBankInfos,
    state.nativeSolBalance,
  ]);
  const [stakeAccounts] = useLstStore((state) => [state.stakeAccounts]);
  const [searchQuery, setSearchQuery] = React.useState("");

  const { connected } = useWalletContext();

  const solUsdValue = React.useMemo(() => {
    const bank = extendedBankInfos.find((bank) => bank.info.state.mint.equals(SOL_MINT));
    return bank ? getPriceWithConfidence(bank.info.oraclePrice, false).price.toNumber() : 0;
  }, [extendedBankInfos]);

  const hasTokens = React.useMemo(() => {
    const hasBankTokens = !!extendedBankInfos.filter(
      (bank) => bank.userInfo.tokenAccount.balance !== 0 || bank.meta.tokenSymbol === "SOL"
    );

    return hasBankTokens;
  }, [extendedBankInfos]);

  /////// FILTERS

  // filter on balance
  const balanceFilter = React.useCallback(
    (bankInfo: ExtendedBankInfo) => {
      const isWSOL = bankInfo.info.state.mint?.equals ? bankInfo.info.state.mint.equals(WSOL_MINT) : false;
      const balance = isWSOL
        ? bankInfo.userInfo.tokenAccount.balance + nativeSolBalance
        : bankInfo.userInfo.tokenAccount.balance;
      return balance > 0;
    },
    [nativeSolBalance]
  );

  // filter on search
  const searchFilter = React.useCallback(
    (bankInfo: ExtendedBankInfo) => {
      const lowerCaseSearchQuery = searchQuery.toLowerCase();
      return bankInfo.meta.tokenSymbol.toLowerCase().includes(lowerCaseSearchQuery);
    },
    [searchQuery]
  );

  /////// BANKS

  // wallet banks
  const filteredBanksUserOwns = React.useMemo(() => {
    return (
      extendedBankInfos
        .filter((bank) => bank.meta.tokenSymbol !== "LST")
        .filter(balanceFilter)
        .filter(searchFilter)
        // .filter((bank) => positionFilter(bank, true))
        .sort((a, b) => {
          const isFirstWSOL = a.info.state.mint?.equals ? a.info.state.mint.equals(WSOL_MINT) : false;
          const isSecondWSOL = b.info.state.mint?.equals ? b.info.state.mint.equals(WSOL_MINT) : false;
          const firstBalance =
            (isFirstWSOL ? a.userInfo.tokenAccount.balance + nativeSolBalance : a.userInfo.tokenAccount.balance) *
            a.info.state.price;
          const secondBalance =
            (isSecondWSOL ? b.userInfo.tokenAccount.balance + nativeSolBalance : b.userInfo.tokenAccount.balance) *
            b.info.state.price;
          return secondBalance - firstBalance;
        })
    );
  }, [extendedBankInfos, searchFilter, nativeSolBalance, balanceFilter]);

  React.useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  return (
    <TokenListCommand selectedBank={selectedBank ?? undefined} onClose={onClose} onSetSearchQuery={setSearchQuery}>
      {!hasTokens && <BuyWithMoonpay />}
      <CommandEmpty>{lstType === LstType.Token ? "No tokens found." : "No native stakes."}</CommandEmpty>
      {/* Active staking positions*/}
      {lstType === LstType.Native && connected && stakeAccounts.length > 0 && (
        <CommandGroup heading="Natively staked">
          {stakeAccounts.map((stakeAcc, index) => {
            return (
              <CommandItem
                key={index}
                value={stakeAcc?.address?.toBase58().toLowerCase()}
                onSelect={(currentValue) => {
                  onSetCurrentTokenBank(stakeAcc.address);
                  onClose();
                }}
                className="cursor-pointer h-[55px] px-3 font-medium flex items-center justify-between gap-2 data-[selected=true]:bg-background-gray-light data-[selected=true]:text-white"
              >
                <ActionBoxNativeItem stakeData={stakeAcc} nativeSolPrice={solUsdValue} />
              </CommandItem>
            );
          })}
        </CommandGroup>
      )}

      {/* LST token staking */}
      {lstType === LstType.Token && connected && filteredBanksUserOwns.length > 0 && (
        <CommandGroup heading="Available in your wallet">
          {filteredBanksUserOwns
            .slice(0, searchQuery.length === 0 ? filteredBanksUserOwns.length : 3)
            .map((bank, index) => {
              return (
                <CommandItem
                  key={index}
                  value={bank?.address?.toString().toLowerCase()}
                  onSelect={(currentValue) => {
                    onSetCurrentTokenBank(
                      extendedBankInfos.find((bankInfo) => bankInfo.address.toString().toLowerCase() === currentValue)
                        ?.address ?? null
                    );
                    onClose();
                  }}
                  className="cursor-pointer h-[55px] px-3 font-medium flex items-center justify-between gap-2 data-[selected=true]:bg-background-gray-light data-[selected=true]:text-white"
                >
                  <ActionBoxItem bank={bank} showBalanceOverride={true} nativeSolBalance={nativeSolBalance} />
                </CommandItem>
              );
            })}
        </CommandGroup>
      )}
    </TokenListCommand>
  );
};
