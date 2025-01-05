import React from "react";

import { DialogProps } from "@radix-ui/react-dialog";

import { dynamicNumeralFormatter } from "@mrgnlabs/mrgn-common";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { IconLoader } from "~/components/ui/icons";

import { RewardsType } from "../../types";

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
      <DialogContent className="md:flex md:gap-6 text-muted-foreground">
        <DialogHeader>
          <DialogTitle className="text-2xl font-normal">Collect Rewards</DialogTitle>
          <DialogDescription>You have rewards available for collection, review and collect below.</DialogDescription>
        </DialogHeader>
        <ul className="list-disc list-inside text-h4">
          {availableRewards?.rewards.map((reward, idx) => (
            <li key={idx} className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-gray-400 rounded-full inline-block" />
              <span className="text-lg font-medium">{`${dynamicNumeralFormatter(reward.amount, {
                tokenPrice: reward.bank.info.oraclePrice.priceRealtime.price.toNumber(),
              })} ${reward.bank.meta.tokenSymbol}`}</span>
            </li>
          ))}
        </ul>
        <Button disabled={isLoading} onClick={onCollect}>
          {isLoading ? <IconLoader size={24} /> : "Collect"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};
