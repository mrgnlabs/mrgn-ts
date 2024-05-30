import React from "react";

import CopyToClipboard from "react-copy-to-clipboard";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";

import { Button } from "~/components/ui/button";
import { Dialog, DialogContent } from "~/components/ui/dialog";
import { IconCheck, IconCopy } from "~/components/ui/icons";

type WalletPkDialogProps = {
  pk?: string;
};

export const WalletPkDialog = ({ pk }: WalletPkDialogProps) => {
  const [isOpen, setIsOpen] = React.useState(true);
  const [isPrivateKeyCopied, setIsPrivateKeyCopied] = React.useState(false);

  return (
    <Dialog open={Boolean(isOpen && pk)} onOpenChange={(open) => setIsOpen(open)}>
      <DialogContent className="md:max-w-[640px]">
        <div className="flex flex-col items-center justify-center text-center space-y-6">
          <h2 className="font-medium text-2xl">Your private key</h2>
          <p>
            Your private key grants access to your wallet. Keep it safe at all time. marginfi does not store your
            private key and cannot help you recover your wallet.
          </p>
        </div>
        <div className="space-y-2 flex flex-col justify-center mt-4">
          <CopyToClipboard
            text={pk!}
            onCopy={() => {
              setIsPrivateKeyCopied(true);
              setTimeout(() => {
                setIsPrivateKeyCopied(false);
              }, 2000);
            }}
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="font-medium flex items-center justify-center gap-1 cursor-pointer">
                    {isPrivateKeyCopied && (
                      <>
                        <IconCheck size={14} /> copied!
                      </>
                    )}
                    {!isPrivateKeyCopied && (
                      <>
                        <IconCopy size={14} /> Copy to clipboard
                      </>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>Click to copy</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CopyToClipboard>
          <CopyToClipboard
            text={pk!}
            onCopy={() => {
              setIsPrivateKeyCopied(true);
              setTimeout(() => {
                setIsPrivateKeyCopied(false);
              }, 2000);
            }}
          >
            <button className="break-words font-mono text-xs p-2 border rounded-md hover:bg-muted transition-colors max-w-[540px] text-left cursor-pointer">
              {pk}
            </button>
          </CopyToClipboard>
        </div>
        <Button className="mx-auto mt-4" onClick={() => setIsOpen(false)}>
          Get Started
        </Button>
      </DialogContent>
    </Dialog>
  );
};
