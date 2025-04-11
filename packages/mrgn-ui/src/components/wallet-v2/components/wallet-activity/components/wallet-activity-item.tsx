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
    case "repay":
      return "Repaid";
    case "stake":
      return "Staked";
    case "unstake":
      return "Unstaked";
    case "loop":
      return "Looped";
    case "deposit-swap":
      return "Swapped";
    default:
      return "";
  }
};

const WalletActivityItem = ({ activity }: { activity: WalletActivity }) => {
  return (
    <div className="p-3 rounded-md space-y-4 bg-accent/25">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2.5 text-sm pr-8">
          <div className="relative w-[22px] h-[22px] overflow-visible">
            <Image
              src={getTokenImageURL(activity.details.mint)}
              alt={activity.details.symbol}
              width={26}
              height={26}
              className="rounded-full"
            />
            {(activity.type === "loop" || activity.type === "repay") && activity.details.secondaryMint && (
              <Image
                src={getTokenImageURL(activity.details.secondaryMint)}
                alt={activity.details.secondarySymbol ?? ""}
                width={16}
                height={16}
                className="rounded-full absolute -bottom-[4px] -right-[4px] border border-muted-foreground/75"
              />
            )}
            {activity.type === "deposit-swap" && activity.details.secondaryImage && (
              <img
                src={activity.details.secondaryImage}
                alt={activity.details.secondarySymbol ?? ""}
                width={16}
                height={16}
                className="rounded-full absolute -bottom-[4px] -right-[4px] border border-muted-foreground/75 size-4"
              />
            )}
            {activity.type === "stake" && (
              <Image
                src={getTokenImageURL("LSTxxxnJzKDFSLr4dUkPcmCf5VyryEqzPLz5j4bpxFp")}
                alt={"LST"}
                width={16}
                height={16}
                className="rounded-full absolute -bottom-[4px] -right-[4px] border border-muted-foreground/75"
              />
            )}
          </div>
          <p>
            {getActivityText(activity.type)}
            {activity.type === "deposit-swap" &&
              activity.details.secondarySymbol &&
              activity.details.secondaryAmount && (
                <>
                  {" "}
                  {dynamicNumeralFormatter(activity.details.secondaryAmount)} {activity.details.secondarySymbol} and
                  <br className="hidden md:block" /> deposited{" "}
                </>
              )}{" "}
            {dynamicNumeralFormatter(activity.details.amount)} {activity.details.symbol}
            {activity.type === "repay" && activity.details.secondaryAmount && (
              <>
                <br className="hidden md:block" /> with {dynamicNumeralFormatter(activity.details.secondaryAmount)}{" "}
                {activity.details.secondarySymbol}
              </>
            )}
            {activity.type === "stake" && <> for LST</>}
            {activity.type === "loop" && (
              <>
                <br className="hidden md:block" /> with {dynamicNumeralFormatter(activity.details.secondaryAmount ?? 0)}{" "}
                {activity.details.secondarySymbol}
              </>
            )}
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
