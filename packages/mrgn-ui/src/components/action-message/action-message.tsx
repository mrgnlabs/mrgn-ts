import Link from "next/link";
import { IconAlertTriangle, IconExternalLink } from "@tabler/icons-react";

import { ActionMessageType, cn } from "@mrgnlabs/mrgn-utils";

type ActionMessageProps = {
  _actionMessage: ActionMessageType;
};

export const ActionMessage = ({ _actionMessage }: ActionMessageProps) => {
  return (
    <div
      className={cn(
        "flex space-x-2 py-2.5 px-3.5 rounded-lg gap-1 text-sm",
        _actionMessage.actionMethod === "INFO" && "bg-info text-info-foreground",
        (!_actionMessage.actionMethod || _actionMessage.actionMethod === "WARNING") && "bg-alert text-alert-foreground",
        _actionMessage.actionMethod === "ERROR" && "bg-[#990000] text-primary"
      )}
    >
      <IconAlertTriangle className="shrink-0 translate-y-0.5" size={16} />
      <div className="space-y-2.5">
        <p>{_actionMessage.description}</p>
        {_actionMessage.link && (
          <p>
            <Link
              href={_actionMessage.link}
              target="_blank"
              rel="noopener noreferrer"
              className="border-b border-warning/50 hover:border-transparent transition-colors"
            >
              <IconExternalLink size={14} className="inline -translate-y-[1px]" />{" "}
              {_actionMessage.linkText || "Read more"}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
};
