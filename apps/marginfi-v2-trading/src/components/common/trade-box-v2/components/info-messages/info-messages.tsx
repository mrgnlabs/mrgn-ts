import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { Wallet } from "@mrgnlabs/mrgn-common";
import { ActionMessageType } from "@mrgnlabs/mrgn-utils";
import { Connection } from "@solana/web3.js";
import { IconAlertTriangle, IconExternalLink } from "@tabler/icons-react";
import Link from "next/link";
import { ActionBox } from "~/components";
import { Button } from "~/components/ui/button";
import { ArenaPoolV2Extended } from "~/store/tradeStoreV2";

interface InfoMessagesProps {
  connected: boolean;
  tradeState: string;
  activePool: ArenaPoolV2Extended;
  isActiveWithCollat: boolean;
  actionMethods: ActionMessageType[];
  additionalChecks?: ActionMessageType;
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
  connection: any;
  wallet: any;
}

export const InfoMessages = ({
  connected,
  tradeState,
  activePool,
  isActiveWithCollat,
  actionMethods = [],
  additionalChecks,
  setIsWalletOpen,
  fetchTradeState,
  connection,
  wallet,
}: InfoMessagesProps) => {
  const renderLongWarning = () => (
    <div className="w-full flex space-x-2 py-2.5 px-3.5 rounded-lg gap-1 text-sm bg-accent text-alert-foreground">
      <IconAlertTriangle className="shrink-0 translate-y-0.5" size={16} />
      <div className="space-y-1">
        <p>
          You need to hold {activePool?.tokenBank.meta.tokenSymbol} to open a long position.{" "}
          <button
            className="border-b border-alert-foreground hover:border-transparent"
            onClick={() => setIsWalletOpen(true)}
          >
            Swap tokens.
          </button>
        </p>
      </div>
    </div>
  );

  const renderShortWarning = () => (
    <div className="w-full flex space-x-2 py-2.5 px-3.5 rounded-lg gap-1 text-sm bg-accent text-alert-foreground">
      <IconAlertTriangle className="shrink-0 translate-y-0.5" size={16} />
      <div className="space-y-1">
        <p>
          You need to hold {activePool?.quoteBank.meta.tokenSymbol} to open a short position.{" "}
          <button
            className="border-b border-alert-foreground hover:border-transparent"
            onClick={() => setIsWalletOpen(true)}
          >
            Swap tokens.
          </button>
        </p>
      </div>
    </div>
  );

  const renderActionMethodMessages = () =>
    actionMethods.concat(additionalChecks ?? []).map(
      (actionMethod, idx) =>
        actionMethod.description && (
          <div className="pb-6 w-full" key={idx}>
            <div
              className={`flex space-x-2 py-2.5 px-3.5 rounded-lg gap-1 text-sm ${
                actionMethod.actionMethod === "INFO"
                  ? "bg-accent text-info-foreground"
                  : actionMethod.actionMethod === "ERROR"
                  ? "bg-[#990000] text-white"
                  : "bg-accent text-alert-foreground"
              }`}
            >
              <IconAlertTriangle className="shrink-0 translate-y-0.5" size={16} />
              <div className="space-y-1">
                <p>{actionMethod.description}</p>
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
                          ${actionMethod.action.type}
                        </Button>
                      ),
                      title: `${actionMethod.action.type} ${actionMethod.action.bank.meta.tokenSymbol}`,
                    }}
                  />
                )}
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
              </div>
            </div>
          </div>
        )
    );

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
    console.log("actionMethods", actionMethods);
    if (!connected) return null;

    switch (true) {
      case tradeState === "long" && activePool?.tokenBank.userInfo.tokenAccount.balance === 0:
        console.log("renderLongWarning");
        return renderLongWarning();

      case tradeState === "short" && activePool?.quoteBank.userInfo.tokenAccount.balance === 0:
        console.log("renderShortWarning");
        return renderShortWarning();

      case isActiveWithCollat:
        console.log("renderActionMethodMessages");
        return renderActionMethodMessages();

      default:
        console.log("renderDepositCollateralDialog");
        return renderDepositCollateralDialog();
    }
  };

  return <div>{renderContent()}</div>;
};
