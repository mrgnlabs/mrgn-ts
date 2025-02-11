import React from "react";
import Link from "next/link";

import { WSOL_MINT } from "@mrgnlabs/mrgn-common";
import { ExtendedBankInfo, ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { LendingModes, cn, computeBankRate } from "@mrgnlabs/mrgn-utils";

import { CommandEmpty, CommandGroup, CommandItem } from "~/components/ui/command";
import { BankItem, BankListCommand } from "~/components/action-box-v2/components";
import { Button } from "~/components/ui/button";
import { IconExternalLink } from "@tabler/icons-react";
import { useRouter } from "next/router";

type BankListProps = {
  selectedBank: ExtendedBankInfo | null;
  banks: ExtendedBankInfo[];
  nativeSolBalance: number;
  isOpen: boolean;
  lendMode: ActionType;
  connected: boolean;
  showTokenSelectionGroups?: boolean;
  onSetSelectedBank: (selectedTokenBank: ExtendedBankInfo | null) => void;
  onClose: (hasSetBank: boolean) => void;
};

export const BankList = ({
  selectedBank,
  banks,
  nativeSolBalance,
  lendMode,
  connected,
  showTokenSelectionGroups = true,
  onSetSelectedBank,
  isOpen,
  onClose,
}: BankListProps) => {
  const router = useRouter();
  const lendingMode = React.useMemo(
    () =>
      lendMode === ActionType.Deposit || lendMode === ActionType.Withdraw ? LendingModes.LEND : LendingModes.BORROW,
    [lendMode]
  );

  const [searchQuery, setSearchQuery] = React.useState("");

  const calculateRate = React.useCallback(
    (bank: ExtendedBankInfo) => {
      return computeBankRate(bank, lendingMode);
    },
    [lendingMode]
  );

  const hasTokens = React.useMemo(() => {
    const hasBankTokens = !!banks.filter(
      (bank) => bank.userInfo.tokenAccount.balance !== 0 || bank.meta.tokenSymbol === "SOL"
    );

    return hasBankTokens;
  }, [banks]);

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

  // filter on positions
  const positionFilter = React.useCallback(
    (bankInfo: ExtendedBankInfo, filterActive?: boolean) =>
      bankInfo.isActive ? lendingMode === LendingModes.LEND && bankInfo.position.isLending : filterActive,
    [lendingMode]
  );

  const solPrice = React.useMemo(() => {
    const solBank = banks.find((bank) => bank.info.state.mint.equals(WSOL_MINT));
    return solBank?.info.oraclePrice.priceRealtime.price.toNumber() ?? 0;
  }, [banks]);

  /////// BANKS

  // wallet banks
  const filteredBanksUserOwns = React.useMemo(() => {
    return (
      banks
        .filter((bank) => bank.info.rawBank.config.assetTag !== 2 || bank.meta.stakePool?.isActive)
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
  }, [banks, balanceFilter, searchFilter, nativeSolBalance]);

  // active position banks
  const filteredBanksActive = React.useMemo(() => {
    return banks
      .filter(searchFilter)
      .filter((bankInfo) => positionFilter(bankInfo, false))
      .sort((a, b) => (b.isActive ? b?.position?.amount : 0) - (a.isActive ? a?.position?.amount : 0));
  }, [banks, searchFilter, positionFilter]);

  // other banks without positions
  const filteredBanks = React.useMemo(() => {
    return banks.filter(searchFilter);
  }, [banks, searchFilter]);

  // global, non staked asset banks
  const globalBanks = React.useMemo(
    () => filteredBanks.filter((bank) => bank.info.rawBank.config.assetTag !== 2 && !bank.info.state.isIsolated),
    [filteredBanks]
  );

  // isolated, non staked asset banks
  const isolatedBanks = React.useMemo(
    () => filteredBanks.filter((bank) => bank.info.rawBank.config.assetTag !== 2 && bank.info.state.isIsolated),
    [filteredBanks]
  );

  // staked asset banks
  const stakedAssetBanks = React.useMemo(
    () => filteredBanks.filter((bank) => bank.info.rawBank.config.assetTag === 2),
    [filteredBanks]
  );

  React.useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  return (
    <>
      <BankListCommand selectedBank={selectedBank} onClose={() => onClose(false)} onSetSearchQuery={setSearchQuery}>
        {!hasTokens && (
          <div className="text-sm text-[#C0BFBF] font-normal p-3">
            You don&apos;t own any supported tokens in marginfi. Check out what marginfi supports.
          </div>
        )}
        <CommandEmpty>No tokens found.</CommandEmpty>

        {/* LENDING */}
        {lendingMode === LendingModes.LEND && connected && filteredBanksUserOwns.length > 0 && onSetSelectedBank && (
          <CommandGroup heading="Available in your wallet">
            {filteredBanksUserOwns
              .slice(0, searchQuery.length === 0 ? filteredBanksUserOwns.length : 3)
              .map((bank, index) => {
                return (
                  <CommandItem
                    key={index}
                    value={bank?.address?.toString().toLowerCase()}
                    onSelect={(currentValue) => {
                      onSetSelectedBank(
                        banks.find((bankInfo) => bankInfo.address.toString().toLowerCase() === currentValue) ?? null
                      );
                      onClose(true);
                    }}
                    className="cursor-pointer h-[55px] px-3 font-medium flex items-center justify-between gap-2 data-[selected=true]:bg-mfi-action-box-accent data-[selected=true]:text-mfi-action-box-accent-foreground"
                  >
                    <BankItem
                      rate={calculateRate(bank)}
                      lendingMode={lendingMode}
                      bank={bank}
                      showBalanceOverride={true}
                      nativeSolBalance={nativeSolBalance}
                      showStakedAssetLabel={true}
                      solPrice={solPrice}
                    />
                  </CommandItem>
                );
              })}
            <div className="space-y-2 text-center w-full pt-5 pb-4">
              <p className="text-xs text-muted-foreground">Don&apos;t hold supported tokens?</p>
              <Button
                variant="outline"
                className="mx-auto font-normal text-[11px]"
                size="sm"
                onClick={() => {
                  onClose(false);
                  router.push("/deposit-swap");
                }}
              >
                <span>Try deposit swap</span>
              </Button>
            </div>
          </CommandGroup>
        )}
        {lendingMode === LendingModes.LEND &&
          filteredBanksActive.length > 0 &&
          onSetSelectedBank &&
          showTokenSelectionGroups && (
            <CommandGroup heading="Currently supplying">
              {filteredBanksActive.map((bank, index) => (
                <CommandItem
                  key={index}
                  value={bank.address?.toString().toLowerCase()}
                  // disabled={!ownedBanksPk.includes(bank.address)}
                  onSelect={(currentValue) => {
                    onSetSelectedBank(
                      banks.find((bankInfo) => bankInfo.address.toString().toLowerCase() === currentValue) ?? null
                    );
                    onClose(true);
                  }}
                  className={cn(
                    "cursor-pointer font-medium flex items-center justify-between gap-2 data-[selected=true]:bg-mfi-action-box-accent data-[selected=true]:text-mfi-action-box-accent-foreground py-2"
                  )}
                >
                  <BankItem
                    rate={calculateRate(bank)}
                    lendingMode={lendingMode}
                    bank={bank}
                    showBalanceOverride={false}
                    nativeSolBalance={nativeSolBalance}
                    showStakedAssetLabel={true}
                    solPrice={solPrice}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          )}

        {/* BORROWING */}
        {lendingMode === LendingModes.BORROW &&
          filteredBanksActive.length > 0 &&
          onSetSelectedBank &&
          showTokenSelectionGroups && (
            <CommandGroup heading="Currently borrowing">
              {filteredBanksActive.map((bank, index) => (
                <CommandItem
                  key={index}
                  value={bank.address?.toString().toLowerCase()}
                  onSelect={(currentValue) => {
                    onSetSelectedBank(
                      banks.find((bankInfo) => bankInfo.address.toString().toLowerCase() === currentValue) ?? null
                    );
                    onClose(true);
                  }}
                  className={cn(
                    "cursor-pointer font-medium flex items-center justify-between gap-2 data-[selected=true]:bg-mfi-action-box-accent data-[selected=true]:text-mfi-action-box-accent-foreground"
                  )}
                >
                  <BankItem
                    rate={calculateRate(bank)}
                    lendingMode={lendingMode}
                    bank={bank}
                    showBalanceOverride={false}
                    nativeSolBalance={nativeSolBalance}
                    solPrice={solPrice}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          )}

        {/* GLOBAL & ISOLATED */}
        {globalBanks.length > 0 && onSetSelectedBank && showTokenSelectionGroups && (
          <CommandGroup heading="Global pools">
            {globalBanks.map((bank, index) => {
              return (
                <CommandItem
                  key={index}
                  value={bank.address?.toString().toLowerCase()}
                  onSelect={(currentValue) => {
                    onSetSelectedBank(
                      banks.find((bankInfo) => bankInfo.address.toString().toLowerCase() === currentValue) ?? null
                    );
                    onClose(true);
                  }}
                  className={cn(
                    "cursor-pointer font-medium flex items-center justify-between gap-2 data-[selected=true]:bg-mfi-action-box-accent data-[selected=true]:text-mfi-action-box-accent-foreground hover:bg-mfi-action-box-accent hover:text-mfi-action-box-accent-foreground",
                    lendingMode === LendingModes.LEND && "py-2",
                    lendingMode === LendingModes.BORROW && "h-[60px]"
                  )}
                >
                  <BankItem
                    rate={calculateRate(bank)}
                    lendingMode={lendingMode}
                    bank={bank}
                    showBalanceOverride={false}
                    nativeSolBalance={nativeSolBalance}
                    solPrice={solPrice}
                  />
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
        {isolatedBanks.length > 0 && onSetSelectedBank && showTokenSelectionGroups && (
          <CommandGroup heading="Isolated pools">
            {isolatedBanks.map((bank, index) => {
              return (
                <CommandItem
                  key={index}
                  value={bank.address?.toString().toLowerCase()}
                  onSelect={(currentValue) => {
                    onSetSelectedBank(
                      banks.find((bankInfo) => bankInfo.address.toString().toLowerCase() === currentValue) ?? null
                    );
                    onClose(true);
                  }}
                  className={cn(
                    "cursor-pointer font-medium flex items-center justify-between gap-2 data-[selected=true]:bg-mfi-action-box-accent data-[selected=true]:text-mfi-action-box-accent-foreground hover:bg-mfi-action-box-accent hover:text-mfi-action-box-accent-foreground",
                    lendingMode === LendingModes.LEND && "py-2",
                    lendingMode === LendingModes.BORROW && "h-[60px]"
                  )}
                >
                  <BankItem
                    rate={calculateRate(bank)}
                    lendingMode={lendingMode}
                    bank={bank}
                    showBalanceOverride={false}
                    nativeSolBalance={nativeSolBalance}
                    solPrice={solPrice}
                  />
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
        {/* STAKED ASSETS */}
        {lendingMode === LendingModes.LEND && onSetSelectedBank && showTokenSelectionGroups && (
          <>
            {stakedAssetBanks.length > 0 && (
              <CommandGroup heading="Staked asset pools">
                {stakedAssetBanks.map((bank, index) => {
                  return (
                    <CommandItem
                      key={index}
                      value={bank.address?.toString().toLowerCase()}
                      onSelect={(currentValue) => {
                        if (bank.info.rawBank.config.assetTag === 2 && !bank.meta.stakePool?.isActive) {
                          return;
                        }
                        onSetSelectedBank(
                          banks.find((bankInfo) => bankInfo.address.toString().toLowerCase() === currentValue) ?? null
                        );
                        onClose(true);
                      }}
                      className="py-2 cursor-pointer font-medium flex items-center justify-between gap-2 data-[selected=true]:bg-mfi-action-box-accent data-[selected=true]:text-mfi-action-box-accent-foreground hover:bg-mfi-action-box-accent hover:text-mfi-action-box-accent-foreground"
                    >
                      <BankItem
                        rate={calculateRate(bank)}
                        lendingMode={lendingMode}
                        bank={bank}
                        showBalanceOverride={false}
                        nativeSolBalance={nativeSolBalance}
                        solPrice={solPrice}
                      />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
            <CommandItem>
              <div className="space-y-2 text-center w-full pt-3">
                <p className="text-xs text-muted-foreground">Don&apos;t see your native stake available to deposit?</p>
                <div className="flex flex-col gap-1 items-center justify-center">
                  <Button
                    variant="outline"
                    className="mx-auto font-normal text-[11px]"
                    size="sm"
                    onClick={() => {
                      onClose(false);
                      router.push("/staked-assets/create");
                    }}
                  >
                    <span>Create staked asset pool</span>
                  </Button>
                  <Link href="https://docs.marginfi.com/staked-collateral" target="_blank" rel="noreferrer">
                    <Button
                      variant="link"
                      className="mx-auto font-light text-[11px] gap-1 h-5 text-muted-foreground no-underline rounded-none px-0 hover:no-underline hover:text-foreground"
                      size="sm"
                    >
                      <IconExternalLink size={12} />
                      Learn more
                    </Button>
                  </Link>
                </div>
              </div>
            </CommandItem>
          </>
        )}
      </BankListCommand>
    </>
  );
};
