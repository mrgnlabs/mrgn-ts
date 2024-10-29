import Link from "next/link";
import { IconAlertTriangle, IconExternalLink } from "@tabler/icons-react";

import { ActionMethod, cn } from "@mrgnlabs/mrgn-utils";

type ActionMessageProps = {
  actionMethod: ActionMethod;
};

export const ActionMessage = ({ actionMethod }: ActionMessageProps) => {
  return (
    <div
      className={cn(
        "flex space-x-2 py-2.5 px-3.5 rounded-lg gap-1 text-sm",
        actionMethod.actionMethod === "INFO" && "bg-info text-info-foreground",
        (!actionMethod.actionMethod || actionMethod.actionMethod === "WARNING") && "bg-alert text-alert-foreground",
        actionMethod.actionMethod === "ERROR" && "bg-[#990000] text-primary"
      )}
    >
      <IconAlertTriangle className="shrink-0 translate-y-0.5" size={16} />
      <div className="space-y-2.5">
        <p>{actionMethod.description}</p>
        {actionMethod.link && (
          <p>
            <Link
              href={actionMethod.link}
              target="_blank"
              rel="noopener noreferrer"
              className="border-b border-warning/50 hover:border-transparent transition-colors"
            >
              <IconExternalLink size={14} className="inline -translate-y-[1px]" />{" "}
              {actionMethod.linkText || "Read more"}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
};
