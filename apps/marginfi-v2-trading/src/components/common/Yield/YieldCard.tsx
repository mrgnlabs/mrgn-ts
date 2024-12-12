import React from "react";

import Link from "next/link";
import Image from "next/image";

import { IconArrowRight } from "@tabler/icons-react";
import { Connection, PublicKey } from "@solana/web3.js";
import { aprToApy, numeralFormatter, percentFormatter, usdFormatter, USDC_MINT } from "@mrgnlabs/mrgn-common";
import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { cn, capture } from "@mrgnlabs/mrgn-utils";
import { Wallet } from "@mrgnlabs/mrgn-common";

import { useTradeStoreV2 } from "~/store";
import { useConnection } from "~/hooks/use-connection";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";

import { ActionBox, ActionBoxProvider } from "~/components/action-box-v2";
import { Button } from "~/components/ui/button";
import { ArenaPoolV2Extended, GroupStatus } from "~/store/tradeStoreV2";
import { useActionBoxProps } from "~/hooks/useActionBoxProps";

interface YieldCardProps {
  pool: ArenaPoolV2Extended;
}

export const YieldCard = ({ pool }: YieldCardProps) => {
  const { connection } = useConnection();
  const { wallet, connected } = useWallet();
  const [refreshGroup, nativeSolBalance] = useTradeStoreV2((state) => [state.refreshGroup, state.nativeSolBalance]);

  return (
    <div key={pool.groupPk.toBase58()} className="relative bg-background border rounded-xl mb-12 pt-5 pb-2 px-4">
      <Link
        href={`/trade/${pool.groupPk.toBase58()}`}
        className="group bg-background border rounded-xl absolute -top-5 left-3.5 px-2 py-1.5 flex items-center gap-2 transition-colors hover:bg-accent"
      >
        <div className="flex items-center -space-x-2.5">
          <Image
            src={pool.tokenBank.meta.tokenLogoUri}
            alt={pool.tokenBank.meta.tokenSymbol}
            width={24}
            height={24}
            className="rounded-full bg-background z-10"
          />
          <Image
            src={pool.quoteBank.meta.tokenLogoUri}
            alt={pool.quoteBank.meta.tokenSymbol}
            width={24}
            height={24}
            className="rounded-full"
          />
        </div>
        <span>
          {pool.tokenBank.meta.tokenSymbol}/{pool.quoteBank.meta.tokenSymbol}
        </span>
        <div className="flex items-center gap-1 text-mrgn-green">
          <span>Trade</span>
          <IconArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
        </div>
      </Link>
      <YieldItem
        className="pt-2 pb-4 border-b items-center"
        pool={pool}
        bankType="TOKEN"
        connected={connected}
        connection={connection}
        wallet={wallet}
        nativeSolBalance={nativeSolBalance}
        refreshGroup={refreshGroup}
      />
      <YieldItem
        className="pt-4 pb-2 items-center"
        pool={pool}
        bankType="COLLATERAL"
        connected={connected}
        connection={connection}
        wallet={wallet}
        nativeSolBalance={nativeSolBalance}
        refreshGroup={refreshGroup}
      />
    </div>
  );
};

const YieldItem = ({
  pool,
  bankType,
  connected,
  className,
  connection,
  wallet,
  nativeSolBalance,
  refreshGroup,
}: {
  pool: ArenaPoolV2Extended;
  bankType: "COLLATERAL" | "TOKEN";
  connected: boolean;
  className?: string;
  connection: Connection;
  wallet: Wallet;
  nativeSolBalance: number;
  refreshGroup: (args: { groupPk: PublicKey; banks: PublicKey[]; connection: Connection; wallet: Wallet }) => void;
}) => {
  const { marginfiClient, wrappedAccount, accountSummary } = useActionBoxProps(pool.groupPk, [
    pool.tokenBank,
    pool.quoteBank,
  ]);

  const bank = React.useMemo(() => (bankType === "COLLATERAL" ? pool.quoteBank : pool.tokenBank), [bankType, pool]);

  const isProvidingLiquidity = React.useMemo(
    () => bank.isActive && bank.position.isLending && pool.status === GroupStatus.LP,
    [bank, pool]
  );

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
      {bank.isActive && isProvidingLiquidity && (
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
        marginfiClient={marginfiClient}
        selectedAccount={wrappedAccount}
        connected={connected}
        accountSummaryArg={accountSummary}
        showActionComplete={false}
        hidePoolStats={["type"]}
      >
        <div className="flex flex-col gap-2 md:flex-row">
          {isProvidingLiquidity && (
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
                      group: pool.groupPk.toBase58(),
                      bank: bank.meta.tokenSymbol,
                    });
                  },
                  onComplete: () => {
                    refreshGroup({
                      groupPk: pool.groupPk,
                      banks: [pool.tokenBank.address, pool.quoteBank.address],
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
                          group: pool.groupPk.toBase58(),
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
            </>
          )}

          {pool.status === GroupStatus.LONG || pool.status === GroupStatus.SHORT ? (
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
                    group: pool.groupPk.toBase58(),
                    bank: bank.meta.tokenSymbol,
                  });
                },
                onComplete: () => {
                  refreshGroup({
                    groupPk: pool.groupPk,
                    banks: [pool.tokenBank.address, pool.quoteBank.address],
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
                        group: pool.groupPk.toBase58(),
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
        </div>
      </ActionBoxProvider>
    </div>
  );
};
