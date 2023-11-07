import React from "react";
import CopyToClipboard from "react-copy-to-clipboard";
import { MrgnTooltip } from "~/components/common/MrgnTooltip";
import { Dialog, DialogContent } from "~/components/ui/dialog";
import { IconCheck, IconCopy } from "~/components/ui/icons";

type WalletPkDialogProps = {
  pk: string;
  resetPk: () => void;
};

export const WalletPkDialog = ({ pk, resetPk }: WalletPkDialogProps) => {
  const [isPrivateKeyCopied, setIsPrivateKeyCopied] = React.useState(false);

  return (
    <Dialog
      open={Boolean(pk)}
      onOpenChange={(open) => {
        if (!open) {
          resetPk();
        }
      }}
    >
      <DialogContent className="md:max-w-[640px]">
        <div className="flex flex-col items-center space-y-4">
          <h2 className="font-medium text-2xl">Your private key</h2>
          <p>
            Your private key grants access to your wallet. Keep it safe at all time. marginfi does not store your
            private key and cannot help you recover your wallet.
          </p>
        </div>
        <div className="space-y-2">
          <CopyToClipboard
            text={pk}
            onCopy={() => {
              setIsPrivateKeyCopied(true);
              setTimeout(() => {
                setIsPrivateKeyCopied(false);
              }, 2000);
            }}
          >
            <MrgnTooltip title="Click to copy private key">
              <button className="font-medium flex items-center gap-1 cursor-pointer">
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
            </MrgnTooltip>
          </CopyToClipboard>
          <div className="break-words font-mono text-xs p-2 border rounded-md max-w-[540px]">{pk}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
