import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { Wallet } from "@mrgnlabs/mrgn-common";
import { ActionMessageType, cn } from "@mrgnlabs/mrgn-utils";
import { Connection } from "@solana/web3.js";
import { IconAlertTriangle, IconExternalLink, IconLoader } from "@tabler/icons-react";
import Link from "next/link";
import { ActionBox } from "~/components";
import { Button } from "~/components/ui/button";
import { ArenaPoolV2Extended } from "~/types/trade-store.types";

interface InfoMessagesProps {
  connected: boolean;
  tradeState: string;
  activePool: ArenaPoolV2Extended;
  isActiveWithCollat: boolean;
  actionMethods: ActionMessageType[];
  setIsWalletOpen: (value: boolean) => void;
  fetchTradeState: ({
    connection,
    wallet,
    refresh,
  }: {
    connection?: Connection;
    wallet?: Wallet;
    refresh?: boolean;
  }) => Promise<void>;
  refreshSimulation: () => void;
  connection: any;
  wallet: any;
  isRetrying?: boolean;
}

export const InfoMessages = ({
  connected,
  tradeState,
  activePool,
  isActiveWithCollat,
  actionMethods = [],
  setIsWalletOpen,
  fetchTradeState,
  connection,
  wallet,
  refreshSimulation,
  isRetrying,
}: InfoMessagesProps) => {
  const renderWarning = (message: string, action: () => void) => (
    <div
      className={cn(
        "relative flex space-x-2 py-2.5 px-3.5 rounded-lg gap-1 text-sm",
        "bg-alert border border-alert-foreground/20 text-alert-foreground"
      )}
    >
      <IconAlertTriangle className="shrink-0 translate-y-0.5" size={16} />
      <div className="space-y-2.5 w-full">
        <p>{message}</p>
        <Button
          variant="outline"
          size="sm"
          className="border-b border-alert-foreground hover:border-transparent mt-2"
          onClick={action}
        >
          Swap tokens
        </Button>
      </div>
    </div>
  );

  const renderLongWarning = () =>
    renderWarning(`You need to hold ${activePool?.tokenBank.meta.tokenSymbol} to open a long position.`, () =>
      setIsWalletOpen(true)
    );

  const renderShortWarning = () =>
    renderWarning(`You need to hold ${activePool?.quoteBank.meta.tokenSymbol} to open a short position.`, () =>
      setIsWalletOpen(true)
    );

  const renderActionMethodMessages = () => (
    <div className="flex flex-col gap-4">
      {actionMethods.map(
        (actionMethod, idx) =>
          actionMethod.description && (
            <div
              className={cn(
                "relative flex space-x-2 py-2.5 px-3.5 rounded-lg gap-1 text-sm ",
                actionMethod.actionMethod === "INFO" && "bg-info text-info-foreground",
                (!actionMethod.actionMethod || actionMethod.actionMethod === "WARNING") &&
                  "bg-alert border border-alert-foreground/20 text-alert-foreground",
                actionMethod.actionMethod === "ERROR" &&
                  "bg-destructive border border-destructive-foreground/10 text-destructive-foreground"
              )}
              key={idx}
            >
              <IconAlertTriangle className="shrink-0 translate-y-0.5" size={16} />
              <div className="w-full">
                {actionMethod.actionMethod !== "INFO" && (
                  <h3 className="font-normal capitalize mb-1.5">
                    {(actionMethod.actionMethod || "WARNING").toLowerCase()}
                  </h3>
                )}
                <div
                  className={cn("space-y-2.5 text-sm w-4/5", actionMethod.actionMethod !== "INFO" && "text-primary/50")}
                >
                  <p>{actionMethod.description}</p>
                  {actionMethod.link && (
                    <p>
                      <Link
                        href={actionMethod.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:no-underline"
                      >
                        <IconExternalLink size={14} className="inline -translate-y-[1px]" />{" "}
                        {actionMethod.linkText || "Read more"}
                      </Link>
                    </p>
                  )}
                  {actionMethod.retry && refreshSimulation && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 h-7 text-primary"
                      disabled={isRetrying}
                      onClick={refreshSimulation}
                    >
                      {isRetrying ? (
                        <>
                          <IconLoader size={14} className="animate-spin" /> Retrying...
                        </>
                      ) : (
                        "Retry"
                      )}
                    </Button>
                  )}
                </div>
                {actionMethod.action && (
                  <ActionBox.Lend
                    isDialog
                    useProvider
                    lendProps={{
                      connected,
                      requestedLendType: ActionType.Deposit,
                      requestedBank: actionMethod.action.bank,
                      showAvailableCollateral: false,
                      captureEvent: () => console.log("Position added"),
                      onComplete: () => fetchTradeState({ connection, wallet }),
                    }}
                    dialogProps={{
                      trigger: (
                        <Button variant="outline" size="sm" className="gap-1 min-w-16">
                          {actionMethod.action.type}
                        </Button>
                      ),
                      title: `${actionMethod.action.type} ${actionMethod.action.bank.meta.tokenSymbol}`,
                    }}
                  />
                )}
              </div>
            </div>
          )
      )}
    </div>
  );

  // TODO: currently, often two warning messages are shown. We should decide if we want to do that, or if we want to show only one. if we want to show only one, we should add a 'priority' or something to decide which one to show.

  const renderDepositCollateralDialog = () => (
    <ActionBox.Lend
      isDialog
      useProvider
      lendProps={{
        connected,
        requestedLendType: ActionType.Deposit,
        requestedBank: activePool.quoteBank,
        showAvailableCollateral: false,
        captureEvent: () => console.log("Deposit Collateral"),
        onComplete: () => fetchTradeState({ connection, wallet }),
      }}
      dialogProps={{
        trigger: <Button className="w-full">Deposit Collateral</Button>,
        title: `Supply ${activePool.quoteBank.meta.tokenSymbol}`,
      }}
    />
  );

  const renderContent = () => {
    if (!connected) return null;

    switch (true) {
      case tradeState === "long" && activePool?.tokenBank.userInfo.tokenAccount.balance === 0:
        return renderLongWarning();

      case tradeState === "short" && activePool?.quoteBank.userInfo.tokenAccount.balance === 0:
        return renderShortWarning();

      case isActiveWithCollat:
        return renderActionMethodMessages();

      default:
        return renderDepositCollateralDialog();
    }
  };

  return <div>{renderContent()}</div>;
};
