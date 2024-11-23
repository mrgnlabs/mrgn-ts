import React from "react";

import Link from "next/link";
import { IconAlertTriangle, IconExternalLink } from "@tabler/icons-react";
import { ActionMessageType, cn } from "@mrgnlabs/mrgn-utils";

import { IconLoader } from "~/components/ui/icons";
import { Button } from "~/components/ui/button";

type ActionMessageProps = {
  _actionMessage: ActionMessageType;
  isRetrying?: boolean;
  retry?: () => void;
};

export const ActionMessage = ({ _actionMessage, isRetrying = false, retry }: ActionMessageProps) => {
  return (
    <div
      className={cn(
        "relative flex space-x-2 py-2.5 px-3.5 rounded-lg gap-1 text-sm",
        _actionMessage.actionMethod === "INFO" && "bg-info text-info-foreground",
        (!_actionMessage.actionMethod || _actionMessage.actionMethod === "WARNING") &&
          "bg-alert border border-alert-foreground/20 text-alert-foreground",
        _actionMessage.actionMethod === "ERROR" &&
          "bg-destructive border border-destructive-foreground/10 text-destructive-foreground"
      )}
    >
      <IconAlertTriangle className="shrink-0 translate-y-0.5" size={16} />
      <div>
        {_actionMessage.actionMethod !== "INFO" && (
          <h3 className="font-normal capitalize mb-1.5">{(_actionMessage.actionMethod || "WARNING").toLowerCase()}</h3>
        )}
        <div className={cn("space-y-2.5 text-sm w-4/5", _actionMessage.actionMethod !== "INFO" && "text-primary/50 ")}>
          <p>{_actionMessage.description}</p>
          {_actionMessage.link && (
            <p>
              <Link href={_actionMessage.link} target="_blank" rel="noopener noreferrer" className="">
                <IconExternalLink size={14} className="inline -translate-y-[1px]" />{" "}
                {_actionMessage.linkText || "Read more"}
              </Link>
            </p>
          )}
        </div>
        {_actionMessage.retry && retry && (
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
      {_actionMessage.code && (
        <small className="text-primary/50 absolute top-2 right-3 text-[10px]">Code {_actionMessage.code}</small>
      )}
    </div>
  );
};
