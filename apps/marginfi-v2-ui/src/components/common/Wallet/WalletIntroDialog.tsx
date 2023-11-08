import React from "react";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useWeb3AuthWallet } from "~/hooks/useWeb3AuthWallet";
import { MrgnTooltip } from "~/components/common/MrgnTooltip";
import { Dialog, DialogContent } from "~/components/ui/dialog";
import { IconCoins, IconCopy, IconCheck } from "~/components/ui/icons";
import { Button } from "~/components/ui/button";
import CopyToClipboard from "react-copy-to-clipboard";

export const WalletIntroDialog = () => {
  const [isWalletIntroOpen, setIsWalletIntroOpen] = React.useState(false);

  const handleDialogClose = () => {
    localStorage.setItem("fundingWalletAcknowledged", "true");
    setIsWalletIntroOpen(false);
    setIsOpenWallet(true);
  };

  React.useEffect(() => {
    if (!localStorage.getItem("fundingWalletAcknowledged")) {
      setIsWalletIntroOpen(true);
    }
  }, []);

  const [isCopied, setIsCopied] = React.useState(false);
  const { wallet } = useWalletContext();
  const { setIsOpenWallet } = useWeb3AuthWallet();

  return (
    <Dialog
      open={isWalletIntroOpen}
      onOpenChange={(open) => {
        if (!open) {
          handleDialogClose();
        }
      }}
    >
      <DialogContent className="md:max-w-[640px]">
        <div className="flex flex-col space-y-8 items-start">
          <header className="flex flex-col items-center justify-center w-full gap-3">
            <IconCoins size={48} />
            <h2 className="font-medium text-2xl">Funding your wallet</h2>
          </header>
          {wallet.publicKey && (
            <div className="space-y-2 w-full">
              <h3>Your mrgnwallet address:</h3>
              <CopyToClipboard
                text={wallet.publicKey.toString()}
                onCopy={() => {
                  setIsCopied(true);
                  setTimeout(() => {
                    setIsCopied(false);
                  }, 2000);
                }}
              >
                <MrgnTooltip title="Click to copy" placement="top" className="hidden md:block">
                  <button className="font-mono font-light border py-1 px-2 text-sm flex items-center justify-between hover:bg-muted transition-colors rounded-md w-full">
                    {isCopied && (
                      <>
                        Copied!
                        <IconCheck size={16} />
                      </>
                    )}
                    {!isCopied && (
                      <>
                        {wallet.publicKey.toString()}
                        <IconCopy size={16} />
                      </>
                    )}
                  </button>
                </MrgnTooltip>
              </CopyToClipboard>
            </div>
          )}
          <p>
            marginfi uses the Solana blockchain, which requires SOL to pay for network fees. Solana enables transactions
            on marginfi to be completed for a fraction of a penny. You must hold a balance of Solana in your wallet to
            use the network (we recommend starting with $5 worth of SOL)..
          </p>
          <Button onClick={() => handleDialogClose()}>Get Started</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
