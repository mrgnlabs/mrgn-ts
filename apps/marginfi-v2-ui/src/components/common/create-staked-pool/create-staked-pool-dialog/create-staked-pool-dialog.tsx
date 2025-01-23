import React from "react";
import Link from "next/link";

import { IconExternalLink } from "@tabler/icons-react";
import Confetti from "react-confetti";
import { useWindowSize } from "@uidotdev/usehooks";

import { cn } from "@mrgnlabs/mrgn-utils";

import { useIsMobile } from "~/hooks/use-is-mobile";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";

import { shortenAddress } from "@mrgnlabs/mrgn-common";
import { IconMrgn } from "~/components/ui/icons";

type CreateStakedPoolDialogProps = {
  asset: string;
  voteAccountKey: string;
  isOpen: boolean;
  onClose: () => void;
};

export const CreateStakedPoolDialog = ({ isOpen, asset, voteAccountKey, onClose }: CreateStakedPoolDialogProps) => {
  const { width, height } = useWindowSize();
  const isMobile = useIsMobile();

  return (
    <div>
      <Confetti
        width={width!}
        height={height! * 2}
        recycle={false}
        opacity={0.4}
        className={cn(isMobile ? "z-[80]" : "z-[60]")}
      />
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className=" w-full h-full flex flex-col sm:justify-center sm:items-center justify-start items-center pt-16 sm:pt-0">
          <DialogHeader className="sr-only">
            <DialogTitle className="space-y-4 text-center flex flex-col items-center justify-center">
              <h2 className="font-medium text-xl">Created Staked Pool!</h2>
            </DialogTitle>
            <DialogDescription className="sr-only">
              You&apos;ve successfully created a staked pool for {asset}!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-12 w-full">
            <>
              <div className="flex flex-col items-center gap-4 border-b border-border pb-10">
                <IconMrgn size={48} />

                <div className="flex items-center justify-center gap-2">
                  <h3 className="text-2xl font-medium text-center">You created a staked pool for {asset}!</h3>
                </div>
              </div>
              <dl className="grid grid-cols-2 w-full text-muted-foreground gap-x-8 gap-y-2">
                {/* <dt>Staked Asset</dt>
                <dd className={cn("text-right", actionTextColor)}>{percentFormatter.format(rate.rateAPY)}</dd> */}
                <dt>Validator Vote Account</dt>
                <dd className="text-right">
                  <Link
                    href={`https://solscan.io/account/${voteAccountKey}`}
                    className="flex items-center justify-end gap-1.5 text-primary text-sm"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="border-b border-border">{shortenAddress(voteAccountKey || "")}</span>{" "}
                    <IconExternalLink size={15} className="-translate-y-[1px]" />
                  </Link>
                </dd>
              </dl>
            </>
          </div>
          <DialogFooter className="flex sm:flex-col gap-4 mt-6 w-full">
            <Button className="w-full" onClick={onClose}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
