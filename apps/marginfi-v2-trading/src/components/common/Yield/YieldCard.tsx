import React from "react";
import Link from "next/link";
import Image from "next/image";
import { IconArrowRight } from "@tabler/icons-react";
import { Connection, PublicKey } from "@solana/web3.js";

import {
  aprToApy,
  numeralFormatter,
  percentFormatter,
  usdFormatter,
  USDC_MINT,
  dynamicNumeralFormatter,
  Wallet,
} from "@mrgnlabs/mrgn-common";
import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { cn, capture, ArenaGroupStatus } from "@mrgnlabs/mrgn-utils";
import { useWallet } from "@mrgnlabs/mrgn-ui";

import { useTradeStoreV2, useUiStore } from "~/store";
import { useConnection } from "~/hooks/use-connection";
import { ArenaPoolV2Extended } from "~/types";
import { useActionBoxProps } from "~/hooks/useActionBoxProps";
import { ActionBox, ActionBoxProvider } from "~/components/action-box-v2";
import { Button } from "~/components/ui/button";

interface YieldCardProps {
  pool: ArenaPoolV2Extended;
}

export const YieldCard = ({ pool }: YieldCardProps) => {
  const { connection } = useConnection();
  const { wallet, connected } = useWallet();
  const [refreshGroup, nativeSolBalance, groupsByGroupPk] = useTradeStoreV2((state) => [
    state.refreshGroup,
    state.nativeSolBalance,
    state.groupsByGroupPk,
  ]);

  const groupData = groupsByGroupPk[pool.groupPk.toBase58()];

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
            className="rounded-full bg-background z-10 w-[24px] h-[24px] object-cover"
          />
          <Image
            src={pool.quoteBank.meta.tokenLogoUri}
            alt={pool.quoteBank.meta.tokenSymbol}
            width={24}
            height={24}
            className="rounded-full w-[24px] h-[24px] object-cover"
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
        admin={groupData.admin}
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
        admin={groupData.admin}
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
  admin,
  connected,
  className,
  connection,
  wallet,
  nativeSolBalance,
  refreshGroup,
}: {
  pool: ArenaPoolV2Extended;
  bankType: "COLLATERAL" | "TOKEN";
  admin: PublicKey;
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

  const { setDisplaySettings } = useUiStore((state) => ({
    setDisplaySettings: state.setDisplaySettings,
  }));

  const bank = React.useMemo(() => (bankType === "COLLATERAL" ? pool.quoteBank : pool.tokenBank), [bankType, pool]);

  const isProvidingLiquidity = React.useMemo(
    () => bank.isActive && bank.position.isLending && pool.status === ArenaGroupStatus.LP,
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
          className="rounded-full w-[24px] h-[24px] object-cover"
        />
        {bank.meta.tokenSymbol}
      </div>
      <div className="grid grid-cols-2 gap-2 my-6">
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-sm">Total Deposits</span>
          <span>
            {dynamicNumeralFormatter(
              bank.info.state.totalDeposits * bank.info.oraclePrice.priceRealtime.price.toNumber(),
              {
                maxDisplay: 1000,
              }
            )}{" "}
            {bank.meta.tokenSymbol}
          </span>
          <span className="text-xs text-muted-foreground">
            {usdFormatter.format(bank.info.state.totalDeposits * bank.info.oraclePrice.priceRealtime.price.toNumber())}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-sm">Lending Rate (APY)</span>
          <span className="text-mrgn-green">{percentFormatter.format(aprToApy(bank.info.state.lendingRate))}</span>
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
        hidePoolStats={["type"]}
        setDisplaySettings={setDisplaySettings}
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
                      Withdraw {bank.meta.tokenSymbol}
                    </Button>
                  ),
                  title: `Withdraw ${bank.meta.tokenSymbol}`,
                }}
              />
            </>
          )}

          {pool.status === ArenaGroupStatus.LONG || pool.status === ArenaGroupStatus.SHORT ? (
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
