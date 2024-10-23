import React from "react";

import { DialogDescription, DialogProps } from "@radix-ui/react-dialog";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { IconLoader } from "~/components/ui/icons";

import { rewardsType } from "../../types";
interface RewardsDialogProps extends DialogProps {
  availableRewards: rewardsType | null;
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
          <DialogTitle className="text-2xl font-normal">Reward overview</DialogTitle>
          <DialogDescription>
            Here you find an overview of which assets have earned rewards. Click the button below to collect them.
          </DialogDescription>
        </DialogHeader>
        <ul className="list-disc list-inside text-h4">
          {availableRewards?.rewards.map((reward, idx) => (
            <li key={idx} className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-gray-400 rounded-full inline-block" />
              <span className="text-lg font-medium">{`${reward.amount} ${reward.bank}`}</span>
            </li>
          ))}
        </ul>
        <Button disabled={isLoading} onClick={onCollect}>
          {isLoading ? <IconLoader size={24} /> : "Collect rewards"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};
