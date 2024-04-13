import React from "react";

import Link from "next/link";
import Image from "next/image";

import Confetti from "react-confetti";
import { useWindowSize } from "@uidotdev/usehooks";
import { PublicKey } from "@solana/web3.js";
import { ActionType, ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { percentFormatterDyn, shortenAddress } from "@mrgnlabs/mrgn-common";

import { MintPageState, cn, getTokenImageURL, signUpYbx } from "~/utils";
import { useUiStore, useLstStore, useMrgnlendStore } from "~/store";
import { useAssetItemData } from "~/hooks/useAssetItemData";
import { useIsMobile } from "~/hooks/useIsMobile";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { IconConfetti, IconExternalLink, IconArrowDown, IconArrowUp, IconYBX, IconCheck } from "~/components/ui/icons";
import { Button } from "~/components/ui/button";
import { DialogDescription, DialogProps } from "@radix-ui/react-dialog";
import { Input } from "~/components/ui/input";

interface YbxDialogProps extends DialogProps {
  mintPageState: MintPageState;
  onHandleChangeMintPage: (state: MintPageState) => void;
  onClose: () => void;
}

export const YbxDialogNotifications: React.FC<YbxDialogProps> = ({
  mintPageState,
  onHandleChangeMintPage,
  onClose,
  ...props
}) => {
  const emailInputRef = React.useRef<HTMLInputElement>(null);

  const signUpNotifications = React.useCallback(async () => {
    try {
      await signUpYbx(emailInputRef, "notifications");
      onHandleChangeMintPage(MintPageState.SUCCESS);
    } catch (error) {
      onHandleChangeMintPage(MintPageState.ERROR);
      return;
    }
  }, [onHandleChangeMintPage, emailInputRef]);

  return (
    <Dialog {...props}>
      <DialogContent className="md:flex">
        <DialogHeader>
          <IconYBX size={48} />
          <DialogTitle className="text-2xl">YBX Early Access</DialogTitle>
          <DialogDescription>Get on the list for Solana&apos;s new decentralized stable-asset, YBX</DialogDescription>
        </DialogHeader>

        {mintPageState === MintPageState.SUCCESS && (
          <div className="flex flex-col items-center gap-4">
            <p className="flex items-center justify-center gap-2">
              <IconCheck size={18} className="text-success" /> You are signed up!
            </p>
            <Button
              variant="outline"
              onClick={() => {
                onHandleChangeMintPage(MintPageState.DEFAULT);
                onClose();
              }}
            >
              Back to YBX
            </Button>
          </div>
        )}

        {(mintPageState === MintPageState.DEFAULT || mintPageState === MintPageState.ERROR) && (
          <>
            <form
              className="w-full px-8 mb-4"
              onSubmit={(e) => {
                e.preventDefault();
                signUpNotifications();
              }}
            >
              <div className="flex items-center w-full gap-2">
                <Input ref={emailInputRef} type="email" placeholder="example@example.com" className="w-full" required />
                <Button type="submit">Sign Up</Button>
              </div>
            </form>

            {mintPageState === MintPageState.ERROR && (
              <p className="text-destructive-foreground text-sm text-center">Error signing up, please try again.</p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
