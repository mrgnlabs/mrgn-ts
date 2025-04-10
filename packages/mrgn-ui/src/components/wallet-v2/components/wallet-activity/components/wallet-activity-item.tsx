import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";

import { getTokenImageURL } from "@mrgnlabs/mrgn-utils";
import { IconExternalLink, IconClock, IconRefresh } from "@tabler/icons-react";

import { WalletActivity } from "~/components/wallet-v2/types/wallet.types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { Button } from "~/components/ui/button";
import { dynamicNumeralFormatter } from "@mrgnlabs/mrgn-common";

const getActivityText = (type: string) => {
  switch (type) {
    case "deposit":
      return "Deposited";
    case "borrow":
      return "Borrowed";
    case "withdraw":
      return "Withdrew";
    default:
      return "";
  }
};

const WalletActivityItem = ({ activity }: { activity: WalletActivity }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2 text-sm pr-8">
          <Image
            src={getTokenImageURL(activity.details.mint)}
            alt={activity.details.symbol}
            width={22}
            height={22}
            className="rounded-full -translate-y-px"
          />
          <p>
            {getActivityText(activity.type)} {dynamicNumeralFormatter(activity.details.amount)}{" "}
            {activity.details.symbol}
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 -translate-y-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="secondary" size="icon" className="h-7 w-7">
                  <IconRefresh size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {getActivityText(activity.type)} more {activity.details.symbol}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="secondary" size="icon" className="h-7 w-7">
                  <Link
                    href={`https://solscan.io/tx/${activity.txn}`}
                    target="_blank"
                    className="flex items-center gap-1"
                  >
                    <IconExternalLink size={14} />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open transaction on explorer</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <time className="text-xs text-muted-foreground flex items-center gap-1">
        <IconClock size={14} />
        {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
      </time>
    </div>
  );
};

export { WalletActivityItem };
