import React from "react";

import Link from "next/link";
import Image from "next/image";

import { IconArrowRight } from "@tabler/icons-react";
import { Connection } from "@solana/web3.js";
import { aprToApy, numeralFormatter, percentFormatter, usdFormatter, USDC_MINT } from "@mrgnlabs/mrgn-common";
import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { cn, capture } from "@mrgnlabs/mrgn-utils";
import { Wallet } from "@mrgnlabs/mrgn-common";

import { useTradeStore } from "~/store";
import { ArenaBank, GroupData } from "~/store/tradeStore";
import { getGroupPositionInfo } from "~/utils";
import { useConnection } from "~/hooks/use-connection";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";

import { ActionBox, ActionBoxProvider } from "~/components/action-box-v2";
import { ActionBoxDialog } from "~/components/common/ActionBox";
import { Button } from "~/components/ui/button";

interface YieldCardProps {
  group: GroupData;
}

export const YieldCard = ({ group }: YieldCardProps) => {
  const { connection } = useConnection();
  const { wallet, connected } = useWallet();
  const [fetchTradeState, nativeSolBalance, portfolio] = useTradeStore((state) => [
    state.fetchTradeState,
    state.nativeSolBalance,
    state.portfolio,
  ]);
  const positionInfo = React.useMemo(() => getGroupPositionInfo({ group }), [group]);
  const isLeveraged = React.useMemo(() => positionInfo === "LONG" || positionInfo === "SHORT", [positionInfo]);

  const collateralBank = group.pool.quoteTokens[0];

  const isLPPosition = React.useCallback(
    (bank: ArenaBank) => {
      if (!portfolio) return false;
      return portfolio.lpPositions.some((group) => group.groupPk.equals(bank.info.rawBank.group));
    },
    [portfolio]
  );

  return (
    <div
      key={group.client.group.address.toBase58()}
      className="relative bg-background border rounded-xl mb-12 pt-5 pb-2 px-4"
    >
      <Link
        href={`/trade/${group.client.group.address.toBase58()}`}
        className="group bg-background border rounded-xl absolute -top-5 left-3.5 px-2 py-1.5 flex items-center gap-2 transition-colors hover:bg-accent"
      >
        <div className="flex items-center -space-x-2.5">
          <Image
            src={group.pool.token.meta.tokenLogoUri}
            alt={group.pool.token.meta.tokenSymbol}
            width={24}
            height={24}
            className="rounded-full bg-background z-10"
          />
          <Image
            src={collateralBank.meta.tokenLogoUri}
            alt={collateralBank.meta.tokenSymbol}
            width={24}
            height={24}
            className="rounded-full"
          />
        </div>
        <span>
          {group.pool.token.meta.tokenSymbol}/{collateralBank.meta.tokenSymbol}
        </span>
        <div className="flex items-center gap-1 text-mrgn-green">
          <span>Trade</span>
          <IconArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
        </div>
      </Link>
      <YieldItem
        className="pt-2 pb-4 border-b items-center"
        group={group}
        bank={group.pool.token}
        isLeveraged={isLeveraged}
        isLPPosition={isLPPosition(group.pool.token)}
        connected={connected}
        connection={connection}
        wallet={wallet}
        nativeSolBalance={nativeSolBalance}
        fetchTradeState={fetchTradeState}
      />
      <YieldItem
        className="pt-4 pb-2 items-center"
        group={group}
        bank={collateralBank}
        isLeveraged={isLeveraged}
        isLPPosition={isLPPosition(collateralBank)}
        connected={connected}
        connection={connection}
        wallet={wallet}
        nativeSolBalance={nativeSolBalance}
        fetchTradeState={fetchTradeState}
      />
    </div>
  );
};

const YieldItem = ({
  group,
  bank,
  className,
  isLeveraged,
  isLPPosition,
  connected,
  connection,
  wallet,
  nativeSolBalance,
  fetchTradeState,
}: {
  group: GroupData;
  bank: ArenaBank;
  className?: string;
  isLeveraged?: boolean;
  isLPPosition?: boolean;
  connected: boolean;
  connection: Connection;
  wallet: Wallet;
  nativeSolBalance: number;
  fetchTradeState: (args: { connection: Connection; wallet: Wallet }) => void;
}) => {
  return (
    <div className={cn("items-center", className)}>
      <div className="flex items-center gap-2">
        <Image
          src={bank.meta.tokenLogoUri}
          alt={bank.meta.tokenSymbol}
          width={24}
          height={24}
          className="rounded-full"
        />
        {bank.meta.tokenSymbol}
      </div>
      <div className="grid grid-cols-2 gap-2 my-6">
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-sm">Total Deposits</span>
          <span>
            {usdFormatter.format(bank.info.state.totalDeposits * bank.info.oraclePrice.priceRealtime.price.toNumber())}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-sm">Lending Rate (APY)</span>
          <span className="text-mrgn-success">{percentFormatter.format(aprToApy(bank.info.state.lendingRate))}</span>
        </div>
      </div>
      {bank.isActive && bank.position.isLending && isLPPosition && (
        <div className="text-sm mb-4">
          <span className="text-muted-foreground">Supplied</span>{" "}
          {usdFormatter.format(bank.position.amount * bank.info.oraclePrice.priceRealtime.price.toNumber())}
          {!bank.info.state.mint.equals(USDC_MINT) && (
            <span className="uppercase ml-1 text-muted-foreground">
              ({numeralFormatter(bank.position.amount)} {bank.meta.tokenSymbol})
            </span>
          )}
        </div>
      )}

      <ActionBoxProvider
        banks={[bank]}
        nativeSolBalance={nativeSolBalance}
        marginfiClient={group.client}
        selectedAccount={group.selectedAccount}
        connected={connected}
        accountSummaryArg={group.accountSummary}
      >
        <div className="flex flex-col gap-2 md:flex-row">
          {bank.isActive && !isLeveraged && bank.position.isLending && group.selectedAccount && (
            <>
              <ActionBox.Lend
                isDialog={true}
                useProvider={true}
                lendProps={{
                  connected: connected,
                  requestedLendType: ActionType.Withdraw,
                  requestedBank: bank,
                  showAvailableCollateral: false,
                  captureEvent: () => {
                    capture("yield_withdraw_btn_click", {
                      group: group.client.group.address.toBase58(),
                      bank: bank.meta.tokenSymbol,
                    });
                  },
                  onComplete: () => {
                    fetchTradeState({
                      connection,
                      wallet,
                    });
                  },
                }}
                dialogProps={{
                  trigger: (
                    <Button
                      variant="outline"
                      onClick={() => {
                        capture("position_add_btn_click", {
                          group: group.client.group.address.toBase58(),
                          bank: bank.meta.tokenSymbol,
                        });
                      }}
                    >
                      Withdraw ${bank.meta.tokenSymbol}
                    </Button>
                  ),
                  title: `Withdraw ${bank.meta.tokenSymbol}`,
                }}
              />
              <ActionBoxDialog activeGroupArg={group} requestedBank={bank} requestedAction={ActionType.Withdraw}>
                <Button
                  className="w-full bg-background border text-foreground hover:bg-accent"
                  onClick={() => {
                    capture("yield_withdraw_btn_click", {
                      group: group.client.group.address.toBase58(),
                      bank: bank.meta.tokenSymbol,
                    });
                  }}
                >
                  Withdraw {bank.meta.tokenSymbol} (old)
                </Button>
              </ActionBoxDialog>
            </>
          )}

          {isLeveraged ? (
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                You cannot provide liquidity with an open trade.{" "}
                <Link
                  className="underline"
                  href={"https://docs.marginfi.com/the-arena#supply-liquidity-and-earn-yield"}
                  target="_blank"
                >
                  learn more
                </Link>
              </p>
              <Button disabled className="w-full bg-background border text-foreground hover:bg-accent">
                Supply {bank.meta.tokenSymbol}
              </Button>
            </div>
          ) : (
            <ActionBox.Lend
              isDialog={true}
              useProvider={true}
              lendProps={{
                connected: connected,
                requestedLendType: ActionType.Deposit,
                requestedBank: bank,
                showAvailableCollateral: false,
                captureEvent: () => {
                  capture("position_add_btn_click", {
                    group: group.client.group.address.toBase58(),
                    bank: bank.meta.tokenSymbol,
                  });
                },
                onComplete: () => {
                  fetchTradeState({
                    connection,
                    wallet,
                  });
                },
              }}
              dialogProps={{
                trigger: (
                  <Button
                    variant="outline"
                    className="gap-1 min-w-16"
                    onClick={() => {
                      capture("position_add_btn_click", {
                        group: group.client.group.address.toBase58(),
                        bank: bank.meta.tokenSymbol,
                      });
                    }}
                  >
                    Supply {bank.meta.tokenSymbol}
                  </Button>
                ),
                title: `Supply ${bank.meta.tokenSymbol}`,
              }}
            />
          )}

          <ActionBoxDialog activeGroupArg={group} requestedBank={bank} requestedAction={ActionType.Deposit}>
            {isLeveraged ? (
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  You cannot provide liquidity with an open trade.{" "}
                  <Link
                    className="underline"
                    href={"https://docs.marginfi.com/the-arena#supply-liquidity-and-earn-yield"}
                    target="_blank"
                  >
                    learn more
                  </Link>
                </p>
                <Button disabled className="w-full bg-background border text-foreground hover:bg-accent">
                  Supply {bank.meta.tokenSymbol} (old)
                </Button>
              </div>
            ) : (
              <Button
                className="w-full bg-background border text-foreground hover:bg-accent"
                onClick={() => {
                  capture("yield_supply_btn_click", {
                    group: group.client.group.address.toBase58(),
                    bank: bank.meta.tokenSymbol,
                  });
                }}
              >
                Supply {bank.meta.tokenSymbol} (old)
              </Button>
            )}
          </ActionBoxDialog>
        </div>
      </ActionBoxProvider>
    </div>
  );
};
