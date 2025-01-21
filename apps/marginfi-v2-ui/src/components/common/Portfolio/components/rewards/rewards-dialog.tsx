/* eslint-disable @next/next/no-img-element */
import React from "react";

import { DialogProps } from "@radix-ui/react-dialog";

import { dynamicNumeralFormatter } from "@mrgnlabs/mrgn-common";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { IconInfoCircle, IconLoader } from "~/components/ui/icons";

import { RewardsType } from "../../types";
import Link from "next/link";
import { Desktop, Mobile } from "@mrgnlabs/mrgn-utils";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "~/components/ui/drawer";

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
    <>
      <Mobile>
        <Drawer {...props}>
          <DrawerContent className="flex flex-col gap-6 mb-10 px-4 text-muted-foreground">
            <DrawerHeader className="pb-0 mb-0">
              <DrawerTitle className="text-3xl text-white font-medium">Collect Rewards</DrawerTitle>
              <DrawerDescription className="">
                You have rewards available for collection. Rewards are automatically collected every 24 hours and can be
                manually claimed at any time.
              </DrawerDescription>
            </DrawerHeader>

            <Button variant="secondary" className="text-white w-max self-center">
              <Link href="https://docs.marginfi.com/" target="_blank" className="flex items-center gap-2">
                {/* TODO: update URL */}
                <IconInfoCircle size={24} />
                Learn more about emissions schedules
              </Link>
            </Button>
            <div className="flex flex-col gap-2 w-full justify-center items-center">
              <span className="text-xl">Your rewards</span>
              {availableRewards?.rewards.map((reward) => (
                <div className="flex items-center gap-2">
                  <img src={reward.bank.meta.tokenLogoUri} alt={reward.bank.meta.tokenSymbol} className="w-6 h-6" />
                  <span className="text-xl font-medium text-white">{`${dynamicNumeralFormatter(reward.amount, {
                    tokenPrice: reward.bank.info.oraclePrice.priceRealtime.price.toNumber(),
                  })} ${reward.bank.meta.tokenSymbol}`}</span>
                </div>
              ))}
            </div>

            <Button disabled={isLoading} onClick={onCollect} className="w-max self-center">
              {isLoading ? <IconLoader size={24} /> : "Claim Rewards"}
            </Button>
          </DrawerContent>
        </Drawer>
      </Mobile>
      <Desktop>
        <Dialog {...props}>
          <DialogContent className="md:flex md:gap-6 text-muted-foreground">
            <DialogHeader className="pb-0 mb-0">
              <DialogTitle className="text-3xl text-white font-medium">Collect Rewards</DialogTitle>
              <DialogDescription className="">
                You have rewards available for collection. Rewards are automatically collected every 24 hours and can be
                manually claimed at any time.
              </DialogDescription>
            </DialogHeader>
            <Button variant="secondary" className="text-white w-max self-center">
              <Link href="https://docs.marginfi.com/" target="_blank" className="flex items-center gap-2">
                {/* TODO: update URL */}
                <IconInfoCircle size={24} />
                Learn more about emissions schedules
              </Link>
            </Button>
            <div className="flex flex-col gap-2 w-full justify-center items-center">
              <span className="text-xl">Your rewards</span>
              {availableRewards?.rewards.map((reward) => (
                <div className="flex items-center gap-2">
                  <img src={reward.bank.meta.tokenLogoUri} alt={reward.bank.meta.tokenSymbol} className="w-6 h-6" />
                  <span className="text-xl font-medium text-white">{`${dynamicNumeralFormatter(reward.amount, {
                    tokenPrice: reward.bank.info.oraclePrice.priceRealtime.price.toNumber(),
                  })} ${reward.bank.meta.tokenSymbol}`}</span>
                </div>
              ))}
            </div>

            <Button disabled={isLoading} onClick={onCollect} className="w-max self-center">
              {isLoading ? <IconLoader size={24} /> : "Claim Rewards"}
            </Button>
          </DialogContent>
        </Dialog>
      </Desktop>
    </>
  );
};
