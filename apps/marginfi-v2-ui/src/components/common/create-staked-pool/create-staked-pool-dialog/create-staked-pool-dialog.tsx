import React from "react";
import Link from "next/link";

import { IconExternalLink } from "@tabler/icons-react";

import { useWindowSize } from "@uidotdev/usehooks";

import { cn, getTokenImageURL } from "@mrgnlabs/mrgn-utils";

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
import { PublicKey } from "@solana/web3.js";

type CreateStakedPoolDialogProps = {
  voteAccountKey: string;
  assetName: string;
  assetSymbol: string;
  assetMint?: PublicKey;
  isOpen: boolean;
  onClose: () => void;
};

export const CreateStakedPoolDialog = ({
  isOpen,
  assetName,
  assetSymbol,
  assetMint,
  voteAccountKey,
  onClose,
}: CreateStakedPoolDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className=" w-full h-full flex flex-col sm:justify-center sm:items-center justify-start items-center pt-16 sm:pt-0">
        <DialogHeader className="sr-only">
          <DialogTitle className="space-y-4 text-center flex flex-col items-center justify-center">
            <h2 className="font-medium text-xl">Created Stake Asset Bank!</h2>
          </DialogTitle>
          <DialogDescription className="sr-only">You created a staked asset bank!</DialogDescription>
        </DialogHeader>
        <div className="space-y-12 w-full">
          <>
            <div className="flex flex-col items-center gap-4 border-b border-border pb-10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {assetMint && (
                <img src={getTokenImageURL(assetMint)} alt={assetName} className="w-16 h-16 rounded-full" />
              )}
              <div className="flex flex-col gap-4 text-center">
                <h3 className="text-2xl font-medium text-center">Staked Asset Bank Created</h3>

                <p className="text-sm text-muted-foreground md:px-12">
                  Your staked asset bank will be available for deposits once the stake pool activates at the end of the
                  epoch.
                </p>
              </div>
            </div>
            <dl className="grid grid-cols-2 w-full text-muted-foreground gap-x-8 gap-y-2">
              <dt>Asset Name</dt>
              <dd className="text-right">{assetName}</dd>
              <dt>Asset Symbol</dt>
              <dd className="text-right">{assetSymbol}</dd>
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
  );
};
