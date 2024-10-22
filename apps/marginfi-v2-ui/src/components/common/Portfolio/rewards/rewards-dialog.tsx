import React from "react";

import { DialogDescription, DialogProps } from "@radix-ui/react-dialog";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { rewardsType } from "..";
import { Button } from "~/components/ui/button";
interface RewardsDialogProps extends DialogProps {
  availableRewards: rewardsType;
  onClose: () => void;
  onCollect: () => void;
}

export const RewardsDialog: React.FC<RewardsDialogProps> = ({ availableRewards, onClose, onCollect, ...props }) => {
  return (
    <Dialog {...props}>
      <DialogContent className="md:flex">
        <DialogHeader>
          <DialogTitle className="text-2xl">Reward overview</DialogTitle>
          <DialogDescription>
            Here you find an overview of which assets have earned rewards. Click the button below to collect them.
          </DialogDescription>
        </DialogHeader>
        <ul>
          {availableRewards.rewards.map((reward) => (
            <li>{`${reward.amount} -> ${reward.bank}`}</li>
          ))}
        </ul>
        <Button onClick={onCollect}>Collect rewards</Button>
      </DialogContent>
    </Dialog>
  );
};
