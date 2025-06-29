import { IconAlertTriangle, IconExternalLink, IconLoader } from "@tabler/icons-react";
import Link from "next/link";

import { ActionMessageType, cn } from "@mrgnlabs/mrgn-utils";
import { ActionBox } from "@mrgnlabs/mrgn-ui";

import { Button } from "~/components/ui/button";
import { ArenaBank } from "~/types/trade-store.types";

interface InfoMessagesProps {
  connected: boolean;
  actionMethods: ActionMessageType[];
  setIsWalletOpen: (value: boolean) => void;
  refreshStore: () => Promise<void>;
  refreshSimulation: () => void;
  isRetrying?: boolean;
  quoteBalance: number;
  quoteBank: ArenaBank;
}

export const InfoMessages = ({
  connected,

  actionMethods = [],
  setIsWalletOpen,
  refreshStore,

  refreshSimulation,
  isRetrying,
  quoteBalance,
  quoteBank,
}: InfoMessagesProps) => {
  const renderActionMethodMessages = () => (
    <div className="flex flex-col gap-4">
      {actionMethods.map(
        (actionMethod, idx) =>
          actionMethod.description && (
            <div
              className={cn(
                "relative flex space-x-2 py-2.5 px-3.5 rounded-md gap-1 text-sm ",
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
                <div className={cn("space-y-2.5 text-sm", actionMethod.actionMethod !== "INFO" && "text-primary/50")}>
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
                      requestedLendType: actionMethod.action.type,
                      requestedBank: actionMethod.action.bank,
                      showAvailableCollateral: false,
                      captureEvent: () => console.log("Position added"),
                      onComplete: () => refreshStore(),
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

  const renderContent = () => {
    if (!connected) return null;

    return renderActionMethodMessages();
  };

  return <div>{renderContent()}</div>;
};
