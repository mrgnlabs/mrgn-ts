import React from "react";

import Link from "next/link";
import Image from "next/image";

import { formatDistanceToNow } from "date-fns";
import { getTokenImageURL } from "@mrgnlabs/mrgn-utils";
import { dynamicNumeralFormatter, shortenAddress } from "@mrgnlabs/mrgn-common";
import { IconExternalLink, IconClock, IconRefresh } from "@tabler/icons-react";

import { WalletActivity } from "~/components/wallet-v2/types/wallet.types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { ActionBox } from "~/components/action-box-v2";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { WalletContextStateOverride } from "~/components/wallet-v2/hooks/use-wallet.hook";

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

type WalletActivityItemProps = {
  activity: WalletActivity;
  bank: ExtendedBankInfo;
  walletContextState: WalletContextStateOverride | WalletContextState;
  onRerun?: () => void;
  closeWallet?: () => void;
};

const WalletActivityItem = ({ activity, bank, walletContextState, onRerun, closeWallet }: WalletActivityItemProps) => {
  return (
    <div className="p-3 rounded-md space-y-4 bg-background-gray">
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
          <RerunAction walletContextState={walletContextState} bank={bank} activity={activity} onRerun={onRerun} />
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
      <div className="flex items-center justify-between">
        {(activity.accountLabel || activity.account) && (
          <p className="text-xs text-muted-foreground">
            Account: {activity.accountLabel || shortenAddress(activity.account)}
          </p>
        )}
        <time className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
          <IconClock size={14} />
          {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
        </time>
      </div>
    </div>
  );
};

type WalletActivityItemSkeletonProps = {
  style?: React.CSSProperties;
};

const WalletActivityItemSkeleton = ({ style }: WalletActivityItemSkeletonProps) => {
  return (
    <div className="p-3 rounded-md bg-accent/25 pt-4 pb-8" style={style}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-2 w-48" />
          <Skeleton className="h-2 w-24" />
        </div>
      </div>
    </div>
  );
};

type RerunActionProps = {
  walletContextState: WalletContextStateOverride | WalletContextState;
  bank: ExtendedBankInfo;
  activity: WalletActivity;
  onRerun?: () => void;
  closeWallet?: () => void;
};

const RerunAction = ({ walletContextState, bank, activity, onRerun, closeWallet }: RerunActionProps) => {
  const activityDetails = React.useMemo(() => {
    switch (activity.type) {
      case "deposit":
      case "deposit-swap":
        return {
          amount: activity.details.amount,
          type: ActionType.Deposit,
          title: `Deposit ${bank.meta.tokenSymbol}`,
        };
      case "borrow":
        return {
          amount: activity.details.amount,
          type: ActionType.Borrow,
          title: `Borrow ${bank.meta.tokenSymbol}`,
        };
      case "withdraw":
        return {
          amount: activity.details.amount,
          type: ActionType.Withdraw,
          title: `Withdraw ${bank.meta.tokenSymbol}`,
        };
      case "repay":
        return {
          amount: activity.details.amount,
          type: ActionType.Repay,
          title: `Repay ${bank.meta.tokenSymbol}`,
        };
      case "loop":
        return {
          amount: activity.details.amount,
          type: ActionType.Loop,
          title: `Loop ${bank.meta.tokenSymbol}`,
        };
      case "stake":
        return {
          amount: activity.details.amount,
          type: ActionType.MintLST,
          title: `Stake ${bank.meta.tokenSymbol}`,
        };
      case "unstake":
        return {
          amount: activity.details.amount,
          type: ActionType.UnstakeLST,
          title: `Unstake ${bank.meta.tokenSymbol}`,
        };
    }
  }, [activity, bank]);

  if (!activityDetails) return null;

  if (
    activityDetails.type === ActionType.Deposit ||
    activityDetails.type === ActionType.Borrow ||
    activityDetails.type === ActionType.Withdraw
  ) {
    return (
      <ActionBox.Lend
        isDialog={true}
        useProvider={true}
        lendProps={{
          requestedBank: bank,
          requestedLendType: activityDetails.type,
          connected: true,
          walletContextState,
          initialAmount: activityDetails.amount,
          onComplete: () => {
            onRerun?.();
          },
        }}
        dialogProps={{
          title: activityDetails.title,
          trigger: (
            <Button variant="secondary" size="icon" className="h-7 w-7">
              <IconRefresh size={14} />
            </Button>
          ),
        }}
      />
    );
  } else if (activityDetails.type === ActionType.Repay) {
    return (
      <ActionBox.Repay
        isDialog={true}
        useProvider={true}
        repayProps={{
          requestedBank: bank,
          connected: true,
          initialAmount: activityDetails.amount,
          onComplete: () => {
            onRerun?.();
          },
        }}
        dialogProps={{
          title: activityDetails.title,
          trigger: (
            <Button variant="secondary" size="icon" className="h-7 w-7">
              <IconRefresh size={14} />
            </Button>
          ),
        }}
      />
    );
  } else if (activityDetails.type === ActionType.Loop) {
    return (
      <ActionBox.Loop
        isDialog={true}
        useProvider={true}
        loopProps={{
          requestedBank: bank,
          connected: true,
          initialAmount: activityDetails.amount,
          onComplete: () => {
            onRerun?.();
          },
        }}
        dialogProps={{
          title: activityDetails.title,
          trigger: (
            <Button variant="secondary" size="icon" className="h-7 w-7">
              <IconRefresh size={14} />
            </Button>
          ),
        }}
      />
    );
  } else if (activityDetails.type === ActionType.MintLST || activityDetails.type === ActionType.UnstakeLST) {
    return (
      <Link href="/stake" onClick={closeWallet}>
        <Button variant="secondary" size="icon" className="h-7 w-7">
          <IconRefresh size={14} />
        </Button>
      </Link>
    );
  }
};

export { WalletActivityItem, WalletActivityItemSkeleton };
