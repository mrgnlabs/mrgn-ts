import React from "react";

import Link from "next/link";
import Image from "next/image";

import { IconArrowRight } from "@tabler/icons-react";
import { Connection } from "@solana/web3.js";
import { aprToApy, numeralFormatter, percentFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";
import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { cn, capture } from "@mrgnlabs/mrgn-utils";
import { Wallet } from "@mrgnlabs/mrgn-common";

import { useTradeStoreV2 } from "~/store";
import { useConnection } from "~/hooks/use-connection";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";

import { ActionBox, ActionBoxProvider } from "~/components/action-box-v2";
import { Button } from "~/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { ArenaPoolV2Extended, GroupStatus } from "~/store/tradeStoreV2";
import { useActionBoxProps } from "~/hooks/useActionBoxProps";

interface props {
  pool: ArenaPoolV2Extended;
}

export const YieldRow = ({ pool }: props) => {
  const { connection } = useConnection();
  const { connected, wallet } = useWallet();
  const [nativeSolBalance, fetchTradeState] = useTradeStoreV2((state) => [
    state.nativeSolBalance,
    state.fetchTradeState,
  ]);

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
        className="pt-2 pb-4 border-b"
        pool={pool}
        bankType="TOKEN"
        connected={connected}
        connection={connection}
        wallet={wallet}
        nativeSolBalance={nativeSolBalance}
        fetchTradeState={fetchTradeState}
      />

      <YieldItem
        className="pt-4 pb-2"
        pool={pool}
        bankType="COLLATERAL"
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
  pool,
  bankType,
  connected,
  className,
  connection,
  wallet,
  nativeSolBalance,
  fetchTradeState,
}: {
  pool: ArenaPoolV2Extended;
  bankType: "COLLATERAL" | "TOKEN";
  connected: boolean;
  className?: string;
  connection: Connection;
  wallet: Wallet;
  nativeSolBalance: number;
  fetchTradeState: (args: { connection: Connection; wallet: Wallet }) => void;
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
    <div className={cn("grid gap-4items-center", className, connected ? "grid-cols-7" : "grid-cols-6")}>
      <div className="flex items-center gap-2">
        <Image
          src={pool.tokenBank.meta.tokenLogoUri}
          alt={pool.tokenBank.meta.tokenSymbol}
          width={24}
          height={24}
          className="rounded-full"
        />
        {pool.tokenBank.meta.tokenSymbol}
      </div>
      <div className="flex flex-col xl:gap-2 xl:flex-row xl:items-baseline">
        <span className="text-xl">{numeralFormatter(pool.tokenBank.info.state.totalDeposits)}</span>
        <span className="text-sm text-muted-foreground">
          {usdFormatter.format(
            pool.tokenBank.info.state.totalDeposits * pool.tokenBank.info.oraclePrice.priceRealtime.price.toNumber()
          )}
        </span>
      </div>

      <div className="text-mrgn-success text-right w-32">
        {percentFormatter.format(aprToApy(pool.tokenBank.info.state.lendingRate))}
      </div>
      <div className="text-mrgn-warning text-right w-32">
        {percentFormatter.format(aprToApy(pool.tokenBank.info.state.borrowingRate))}
      </div>
      <div className="flex justify-center">
        <Link href="https://x.com/marginfi" target="_blank">
          <Image
            src="https://pbs.twimg.com/profile_images/1791110026456633344/VGViq-CJ_400x400.jpg"
            width={20}
            height={20}
            alt="marginfi"
            className="rounded-full"
          />
        </Link>
      </div>
      {connected && (
        <div className="pl-2 text-lg flex flex-col xl:gap-1 xl:flex-row xl:items-baseline">
          {isProvidingLiquidity && bank.isActive && (
            <>
              {numeralFormatter(pool.tokenBank.position.amount)}
              <span className="text-muted-foreground text-sm">{pool.tokenBank.meta.tokenSymbol}</span>
            </>
          )}
        </div>
      )}
      <TooltipProvider>
        <div className="flex justify-end gap-2">
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
                            group: pool.groupPk.toBase58(),
                            bank: bank.meta.tokenSymbol,
                          });
                        }}
                      >
                        Withdraw
                      </Button>
                    ),
                    title: `Withdraw ${bank.meta.tokenSymbol}`,
                  }}
                />
              </>
            )}
            {pool.status === GroupStatus.LONG || pool.status === GroupStatus.SHORT ? (
              <Tooltip>
                <TooltipTrigger className="cursor-default" asChild>
                  <Button disabled className="bg-background border text-foreground hover:bg-accent">
                    Supply
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div>
                    You cannot provide liquidity with an open trade. <br />
                    <Link
                      className="underline"
                      href={"https://docs.marginfi.com/the-arena#supply-liquidity-and-earn-yield"}
                      target="_blank"
                    >
                      learn more
                    </Link>
                  </div>
                </TooltipContent>
              </Tooltip>
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
                          group: pool.groupPk.toBase58(),
                          bank: bank.meta.tokenSymbol,
                        });
                      }}
                    >
                      Supply
                    </Button>
                  ),
                  title: `Supply ${bank.meta.tokenSymbol}`,
                }}
              />
            )}
          </ActionBoxProvider>
        </div>
      </TooltipProvider>
    </div>
  );
};
