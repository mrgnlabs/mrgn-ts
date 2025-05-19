import React from "react";
import Image from "next/image";

import { DialogProps } from "@radix-ui/react-dialog";

import { dynamicNumeralFormatter } from "@mrgnlabs/mrgn-common";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { IconInfoCircle, IconLoader } from "~/components/ui/icons";

import { RewardsType } from "../../types";
import Link from "next/link";

interface RewardsDialogProps extends DialogProps {
  availableRewards: RewardsType;
  onClose: () => void;
  onCollect: () => void;
  isLoading: boolean;
}

export const RewardsDialog: React.FC<RewardsDialogProps> = ({
  availableRewards,
  onClose,
  onCollect,
  isLoading,
  ...props
}) => {
  return (
    <Dialog {...props}>
      <DialogContent className="md:flex md:gap-6">
        <DialogHeader>
          <DialogTitle className="text-3xl font-medium">Collect Rewards</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm" asChild>
            <div className="flex flex-col gap-6 items-center">
              <p>
                You have rewards available for collection. Learn more
                <br className="hidden md:block" /> about our emissions program and collect your rewards below.
              </p>
              <Link
                href="https://docs.marginfi.com/faqs#how-does-emissions-work"
                target="_blank"
                rel="noreferrer"
                className="text-primary flex items-center gap-1m"
              >
                <Button variant="secondary" size="sm">
                  <IconInfoCircle size={16} /> Learn more about emissions program
                </Button>
              </Link>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 items-center">
          <h3 className="text-lg text-muted-foreground">Your rewards</h3>
          <ul className="list-inside space-y-1">
            {availableRewards?.rewards.map((reward, idx) => (
              <li key={idx} className="flex items-center space-x-2">
                <Image
                  src={reward.bank.meta.tokenLogoUri}
                  alt={reward.bank.meta.tokenSymbol}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
                <span className="text-lg font-medium">{`${dynamicNumeralFormatter(reward.amount, {
                  tokenPrice: reward.bank.info.oraclePrice.priceRealtime.price.toNumber(),
                })} ${reward.bank.meta.tokenSymbol}`}</span>
              </li>
            ))}
          </ul>
        </div>
        <Button disabled={isLoading} onClick={onCollect} className="max-w-fit mx-auto px-8">
          {isLoading ? <IconLoader size={24} /> : "Collect Rewards"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};
