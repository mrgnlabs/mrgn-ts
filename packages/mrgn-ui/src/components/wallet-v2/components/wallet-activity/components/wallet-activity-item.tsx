import React from "react";

import Link from "next/link";
import Image from "next/image";

import { formatDistanceToNow } from "date-fns";
import { composeExplorerUrl, getTokenImageURL } from "@mrgnlabs/mrgn-utils";
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

const getActivityText = (activity: WalletActivity) => {
  const { type, details } = activity;

  if (type === ActionType.Deposit && details.secondaryMint) {
    return `Swapped ${details.secondaryAmount} ${details.secondarySymbol} and deposited ${details.amount} ${details.symbol}`;
  }

  if (type === ActionType.MintLST && details.secondaryAmount) {
    return `Staked ${details.amount} ${details.symbol} for ${details.secondaryAmount} LST`;
  }

  if (type === ActionType.RepayCollat && details.secondaryAmount) {
    return `Repaid ${details.amount} ${details.symbol} with ${details.secondaryAmount} ${details.secondarySymbol}`;
  }

  switch (type) {
    case ActionType.Deposit:
      return `Deposited ${details.amount} ${details.symbol}`;
    case ActionType.Borrow:
      return `Borrowed ${details.amount} ${details.symbol}`;
    case ActionType.Withdraw:
      return `Withdrew ${details.amount} ${details.symbol}`;
    case ActionType.Repay:
    case ActionType.RepayCollat:
      return `Repaid ${details.amount} ${details.symbol}`;
    case ActionType.MintLST:
      return `Staked ${details.amount} ${details.symbol} for LST`;
    case ActionType.InstantUnstakeLST:
    case ActionType.UnstakeLST:
      return `Unstaked ${details.amount} ${details.symbol}`;
    case ActionType.Loop:
      return `Looped ${details.amount} ${details.symbol}`;
    default:
      return "";
  }
};

type WalletActivityItemProps = {
  activity: WalletActivity;
  bank: ExtendedBankInfo;
  secondaryBank?: ExtendedBankInfo;
  walletContextState: WalletContextStateOverride | WalletContextState;
  onRerun?: () => void;
  closeWallet?: () => void;
};

const WalletActivityItem = ({
  activity,
  bank,
  secondaryBank,
  walletContextState,
  onRerun,
  closeWallet,
}: WalletActivityItemProps) => {
  return (
    <div className="p-3 rounded-md space-y-4 bg-background-gray">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2.5 text-sm pr-8 max-w-[80%]">
          <div className="relative w-[22px] h-[22px] overflow-visible">
            <Image
              src={getTokenImageURL(activity.details.mint)}
              alt={activity.details.symbol}
              width={26}
              height={26}
              className="rounded-full"
            />
            {(activity.type === ActionType.Loop ||
              activity.type === ActionType.Repay ||
              activity.type === ActionType.RepayCollat ||
              activity.type === ActionType.Deposit) &&
              activity.details.secondaryMint && (
                <Image
                  src={getTokenImageURL(activity.details.secondaryMint)}
                  alt={activity.details.secondarySymbol ?? ""}
                  width={16}
                  height={16}
                  className="rounded-full absolute -bottom-[4px] -right-[4px] border border-muted-foreground/75"
                />
              )}
            {activity.type === ActionType.MintLST && (
              <Image
                src={getTokenImageURL("LSTxxxnJzKDFSLr4dUkPcmCf5VyryEqzPLz5j4bpxFp")}
                alt={"LST"}
                width={16}
                height={16}
                className="rounded-full absolute -bottom-[4px] -right-[4px] border border-muted-foreground/75"
              />
            )}
          </div>
          <p>{getActivityText(activity)}</p>
        </div>
        <div className="flex items-center justify-end gap-2 -translate-y-1">
          <RerunAction
            walletContextState={walletContextState}
            bank={bank}
            activity={activity}
            secondaryBank={secondaryBank}
            onRerun={onRerun}
            closeWallet={closeWallet}
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="secondary" size="icon" className="h-7 w-7">
                  <Link
                    href={composeExplorerUrl(activity.txn) ?? ""}
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
      <div className="flex items-center justify-between gap-2">
        {(activity.accountLabel || activity.account) && (
          <p className="text-xs text-muted-foreground w-1/2 truncate">
            Account: {activity.accountLabel || shortenAddress(activity.account)}
          </p>
        )}
        <time className="text-xs text-muted-foreground flex items-center justify-end gap-1 ml-auto w-1/2 truncate text-right">
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

const RerunTooltipButton = ({ children }: { children?: React.ReactNode }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="secondary" size="icon" className="h-7 w-7">
          {children || <IconRefresh size={14} />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>Re-run this action</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

type RerunActionProps = {
  walletContextState: WalletContextStateOverride | WalletContextState;
  bank: ExtendedBankInfo;
  activity: WalletActivity;
  secondaryBank?: ExtendedBankInfo;
  onRerun?: () => void;
  closeWallet?: () => void;
};

const RerunAction = ({ walletContextState, bank, activity, secondaryBank, onRerun, closeWallet }: RerunActionProps) => {
  // for now we link to respective pages for loop, stake, and deposit-swap
  if (activity.type === ActionType.Loop) {
    return (
      <Link href="/looper" onClick={closeWallet}>
        <RerunTooltipButton />
      </Link>
    );
  } else if (activity.type === ActionType.MintLST || activity.type === ActionType.InstantUnstakeLST) {
    return (
      <Link href="/stake" onClick={closeWallet}>
        <RerunTooltipButton />
      </Link>
    );
  } else if (activity.type === ActionType.Deposit && activity.details.secondaryMint) {
    return (
      <Link href="/deposit-swap" onClick={closeWallet}>
        <RerunTooltipButton />
      </Link>
    );
  } else if (
    activity.type === ActionType.Deposit ||
    activity.type === ActionType.Borrow ||
    activity.type === ActionType.Withdraw
  ) {
    // check collateral is available for withdraw
    if (
      activity.type === ActionType.Withdraw &&
      (!bank.isActive || !bank.position.isLending || bank.position.amount < activity.details.amount)
    ) {
      return null;
    }

    return (
      <ActionBox.Lend
        isDialog={true}
        useProvider={true}
        lendProps={{
          requestedBank: bank,
          requestedLendType: activity.type,
          connected: true,
          walletContextState,
          initialAmount: activity.details.amount,
          onComplete: () => {
            onRerun?.();
          },
        }}
        dialogProps={{
          title: `${activity.type} ${activity.details.symbol}`,
          trigger: <RerunTooltipButton />,
        }}
      />
    );
  } else if (activity.type === ActionType.Repay || activity.type === ActionType.RepayCollat) {
    // check liability is available for repay
    if (
      activity.type === ActionType.Repay &&
      (!bank.isActive || !bank.position.isLending || bank.position.amount < activity.details.amount)
    ) {
      return null;
    }

    // check collateral is available for repay
    if (
      activity.type === ActionType.RepayCollat &&
      secondaryBank &&
      activity.details.secondaryAmount &&
      (!secondaryBank.isActive ||
        !secondaryBank.position.isLending ||
        secondaryBank.position.amount < activity.details.secondaryAmount)
    ) {
      return null;
    }

    return (
      <ActionBox.Repay
        isDialog={true}
        useProvider={true}
        repayProps={{
          requestedBank: bank,
          requestedSecondaryBank: secondaryBank,
          connected: true,
          initialAmount:
            activity.type === ActionType.RepayCollat ? activity.details.secondaryAmount : activity.details.amount,
          onComplete: () => {
            onRerun?.();
          },
        }}
        dialogProps={{
          title: `Repay ${activity.details.symbol}`,
          trigger: <RerunTooltipButton />,
        }}
      />
    );
  }

  return null;
};

export { WalletActivityItem, WalletActivityItemSkeleton };
