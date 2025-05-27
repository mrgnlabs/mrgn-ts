import React from "react";

import Link from "next/link";
import { IconAlertTriangle, IconExternalLink } from "@tabler/icons-react";
import { ActionMessageType, cn } from "@mrgnlabs/mrgn-utils";

import { IconLoader, IconEmode } from "~/components/ui/icons";
import { Button } from "~/components/ui/button";

type ActionMessageProps = {
  actionMessage: ActionMessageType;
  isRetrying?: boolean;
  retry?: () => void;
};

export const ActionMessage = ({ actionMessage, isRetrying = false, retry }: ActionMessageProps) => {
  const isEmode = actionMessage?.actionSubType === "EMODE";
  const title = isEmode ? "e-mode warning" : actionMessage.actionMethod || "WARNING";

  const getActionStyles = () => {
    const baseStyles = "relative flex space-x-2 py-2.5 px-3.5 rounded-lg gap-1 text-sm";

    const actionMethod = actionMessage?.actionSubType || actionMessage.actionMethod || "WARNING";
    // Style based on action method
    let methodStyles = "";
    switch (actionMethod) {
      case "EMODE":
        methodStyles = "text-mfi-emode border border-mfi-emode/40 pr-0 pb-2";
        break;
      case "INFO":
        methodStyles = "bg-info text-info-foreground";
        break;
      case "ERROR":
        methodStyles = "bg-destructive border border-destructive-foreground/10 text-destructive-foreground";
        break;
      case "WARNING":
        methodStyles = "bg-alert border border-alert-foreground/20 text-alert-foreground";
      default:
        break;
    }

    return cn(baseStyles, methodStyles);
  };

  return (
    <div className={getActionStyles()}>
      {isEmode ? (
        <IconEmode className="shrink-0 -translate-y-1" size={24} />
      ) : (
        <IconAlertTriangle className="shrink-0 translate-y-0.5" size={16} />
      )}
      <div className="w-full">
        {actionMessage.actionMethod !== "INFO" && (
          <h3 className={cn("font-normal mb-1.5", !isEmode && "capitalize")}>{title.toLowerCase()}</h3>
        )}
        <div
          className={cn(
            "space-y-2.5 text-sm w-4/5",
            actionMessage.actionMethod !== "INFO" && !isEmode && "text-primary/50"
          )}
        >
          <p>{actionMessage.description}</p>
          {actionMessage.link && (
            <p>
              <Link href={actionMessage.link} target="_blank" rel="noopener noreferrer" className="">
                <IconExternalLink size={14} className="inline -translate-y-[1px]" />{" "}
                {actionMessage.linkText || "Read more"}
              </Link>
            </p>
          )}
        </div>
        {actionMessage.retry && retry && (
          <Button variant="outline" size="sm" className="mt-4 h-7 text-primary" disabled={isRetrying} onClick={retry}>
            {isRetrying ? (
              <>
                <IconLoader size={14} /> Retrying...
              </>
            ) : (
              "Retry"
            )}
          </Button>
        )}
      </div>
      {actionMessage.code && !isEmode && (
        <small className="text-primary/50 absolute top-2 right-3 text-[10px]">Code {actionMessage.code}</small>
      )}
    </div>
  );
};
