import React from "react";

import { IconMinus, IconPlus } from "@tabler/icons-react";
import { cn, capture } from "@mrgnlabs/mrgn-utils";
import { ActiveBankInfo, ActionType, AccountSummary } from "@mrgnlabs/marginfi-v2-ui-state";

import { useConnection } from "~/hooks/use-connection";
import { useTradeStoreV2, useUiStore } from "~/store";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";

import { ActionBox, ActionBoxProvider } from "~/components/action-box-v2";
import { Button } from "~/components/ui/button";

import { MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { ArenaPoolV2Extended, GroupStatus } from "~/types/trade-store.types";
import { ClosePosition } from "./components";

type PositionActionButtonsProps = {
  isBorrowing: boolean;
  arenaPool: ArenaPoolV2Extended;
  accountSummary: AccountSummary;
  client: MarginfiClient | null;
  selectedAccount: MarginfiAccountWrapper | null;
  className?: string;
  rightAlignLastButton?: boolean;
};

export const PositionActionButtons = ({
  isBorrowing,
  arenaPool,
  accountSummary,
  client,
  selectedAccount,
  className,
  rightAlignLastButton = false,
}: PositionActionButtonsProps) => {
  const { connection } = useConnection();
  const { wallet, connected } = useWallet();

  const { setDisplaySettings } = useUiStore((state) => ({
    setDisplaySettings: state.setDisplaySettings,
  }));

  const [refreshGroup, nativeSolBalance, positionsByGroupPk, banksByBankPk, fetchWalletTokens, walletTokens] =
    useTradeStoreV2((state) => [
      state.refreshGroup,
      state.nativeSolBalance,
      state.positionsByGroupPk,
      state.banksByBankPk,
      state.fetchWalletTokens,
      state.walletTokens,
    ]);

  const depositBanks = React.useMemo(() => {
    const tokenBank = arenaPool.tokenBank.isActive ? arenaPool.tokenBank : null;
    const quoteBank = arenaPool.quoteBank.isActive ? arenaPool.quoteBank : null;

    return [tokenBank, quoteBank].filter((bank): bank is ActiveBankInfo => bank !== null && bank.position.isLending);
  }, [arenaPool]);

  const borrowBank = React.useMemo(() => {
    const tokenBank = arenaPool.tokenBank.isActive ? arenaPool.tokenBank : null;
    const quoteBank = arenaPool.quoteBank.isActive ? arenaPool.quoteBank : null;

    let borrowBank = null;
    if (tokenBank && !tokenBank.position.isLending) {
      borrowBank = tokenBank;
    } else if (quoteBank && !quoteBank.position.isLending) {
      borrowBank = quoteBank;
    }

    return borrowBank;
  }, [arenaPool]);

  const extendedBankInfos = React.useMemo(() => {
    const banks = Object.values(banksByBankPk);
    const uniqueBanksMap = new Map(banks.map((bank) => [bank.info.state.mint.toBase58(), bank]));
    const uniqueBanks = Array.from(uniqueBanksMap.values());
    return uniqueBanks;
  }, [banksByBankPk]);

  React.useEffect(() => {
    if (
      wallet &&
      extendedBankInfos &&
      extendedBankInfos.length > 0 &&
      (walletTokens === null || walletTokens.length === 0)
    ) {
      fetchWalletTokens(wallet, extendedBankInfos);
    }
  }, [fetchWalletTokens, wallet, walletTokens, extendedBankInfos]);
  // TODO: confirm this isnt fetching too often

  return (
    <ActionBoxProvider
      nativeSolBalance={nativeSolBalance}
      banks={borrowBank ? [borrowBank, depositBanks[0]] : [depositBanks[0]]}
      marginfiClient={client}
      selectedAccount={selectedAccount}
      connected={connected}
      accountSummaryArg={accountSummary}
      showActionComplete={false}
      hidePoolStats={["type"]}
      setDisplaySettings={setDisplaySettings}
    >
      <div className={cn("flex gap-3 w-full", className)}>
        <ActionBox.DepositSwap
          isDialog={true}
          useProvider={true}
          depositSwapProps={{
            connected: connected,
            requestedDepositBank: depositBanks[0],
            requestedSwapBank: arenaPool.status === GroupStatus.LONG ? borrowBank ?? undefined : undefined,
            showAvailableCollateral: false,
            walletTokens: null,
            captureEvent: () => {
              capture("position_add_btn_click", {
                group: arenaPool.groupPk?.toBase58(),
                token: arenaPool.tokenBank.meta.tokenSymbol,
              });
            },
            onComplete: () => {
              refreshGroup({
                connection,
                wallet,
                groupPk: arenaPool.groupPk,
                banks: [arenaPool.tokenBank.address, arenaPool.quoteBank.address],
              });
            },
          }}
          dialogProps={{
            trigger: (
              <Button
                variant="outline"
                size="sm"
                className="gap-1 min-w-16"
                onClick={() => {
                  capture("position_add_btn_click", {
                    group: arenaPool.groupPk?.toBase58(),
                    token: arenaPool.tokenBank.meta.tokenSymbol,
                  });
                }}
              >
                <IconPlus size={14} />
                Add
              </Button>
            ),
            title: `Supply ${arenaPool.tokenBank.meta.tokenSymbol}`,
          }}
        />
        {borrowBank && isBorrowing && (
          <ActionBox.Repay
            useProvider={true}
            repayProps={{
              requestedBank: borrowBank,
              requestedSecondaryBank: depositBanks[0],
              banks: borrowBank ? [borrowBank, depositBanks[0]] : [depositBanks[0]],
              connected: connected,
              showAvailableCollateral: false,
              captureEvent: (event, properties) => {
                capture("position_reduce_btn_click", {
                  group: arenaPool.groupPk?.toBase58(),
                  token: arenaPool.tokenBank.meta.tokenSymbol,
                });
              },
              onComplete: () => {
                refreshGroup({
                  connection,
                  wallet,
                  groupPk: arenaPool.groupPk,
                  banks: [arenaPool.tokenBank.address, arenaPool.quoteBank.address],
                });
              },
            }}
            isDialog={true}
            dialogProps={{
              trigger: (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 min-w-16"
                  onClick={() => {
                    capture("position_reduce_btn_click", {
                      group: arenaPool.groupPk?.toBase58(),
                      token: arenaPool.tokenBank.meta.tokenSymbol,
                    });
                  }}
                >
                  <IconMinus size={14} />
                  Reduce
                </Button>
              ),
              title: `Reduce ${borrowBank?.meta.tokenSymbol}`,
            }}
          />
        )}
        {!isBorrowing && (
          <ActionBox.Lend
            isDialog={true}
            useProvider={true}
            lendProps={{
              connected: connected,
              requestedLendType: ActionType.Withdraw,
              requestedBank: arenaPool.tokenBank ?? undefined,
              banks: borrowBank ? [borrowBank, depositBanks[0]] : [depositBanks[0]],

              captureEvent: () => {
                capture("position_withdraw_btn_click", {
                  group: arenaPool.groupPk?.toBase58(),
                  token: arenaPool.tokenBank.meta.tokenSymbol,
                });
              },
              onComplete: () => {
                refreshGroup({
                  connection,
                  wallet,
                  groupPk: arenaPool.groupPk,
                  banks: [arenaPool.tokenBank.address, arenaPool.quoteBank.address],
                });
              },
            }}
            dialogProps={{
              trigger: (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 min-w-16"
                  onClick={() => {
                    capture("position_add_btn_click", {
                      group: arenaPool.groupPk?.toBase58(),
                      token: arenaPool.tokenBank.meta.tokenSymbol,
                    });
                  }}
                >
                  <IconPlus size={14} />
                  Withdraw
                </Button>
              ),
              title: `Withdraw ${arenaPool.tokenBank.meta.tokenSymbol}`,
            }}
          />
        )}

        <ClosePosition
          arenaPool={arenaPool}
          positionsByGroupPk={positionsByGroupPk}
          depositBanks={depositBanks}
          borrowBank={borrowBank}
        />
      </div>
    </ActionBoxProvider>
  );
};
