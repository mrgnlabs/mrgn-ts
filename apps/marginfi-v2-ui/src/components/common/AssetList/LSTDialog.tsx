import React from "react";

import Image from "next/image";
import Link from "next/link";

import { useMrgnlendStore } from "~/store";
import { getTokenImageURL } from "~/utils";

import { Dialog, DialogContent } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";

export enum LSTDialogVariants {
  SOL = "SOL",
  stSOL = "stSOL",
}

type LSTDialogProps = {
  variant: LSTDialogVariants | null;
  open: boolean;
  onClose: () => void;
};

const LSTDialog = ({ variant, open, onClose }: LSTDialogProps) => {
  const [sortedBanks] = useMrgnlendStore((state) => [state.extendedBankInfos]);

  const tokenImage = React.useMemo(() => {
    const bank = sortedBanks.find((bank) => bank.meta.tokenSymbol === variant);
    if (!bank) return null;

    return getTokenImageURL(bank.meta.tokenSymbol);
  }, [variant, sortedBanks]);

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="md:max-w-4xl">
        <div className="flex flex-col items-center text-center gap-6">
          {tokenImage && (
            <div className="flex items-center justify-center">
              <Image
                src="https://storage.googleapis.com/static-marginfi/lst.png"
                alt="lst"
                height={80}
                width={80}
                className="rounded-full translate-x-4 drop-shadow-lg"
              />
              <Image
                src={tokenImage}
                alt={tokenImage}
                height={80}
                width={80}
                className="rounded-full -translate-x-4 drop-shadow-lg"
              />
            </div>
          )}
          {variant === LSTDialogVariants.stSOL && (
            <>
              <h2 className="text-2xl font-bold">Swap stSOL for LST?</h2>
              <div className="space-y-4">
                <p>Lido is sunsetting stSOL. Swap your stSOL for LST now and earn higher yield</p>
                <div className="text-[#DCE85D] space-y-2 font-bold">
                  <p>LST is the only 8% yielding LST.</p>
                  <p>LST is the only 0% commission LST.</p>
                  <p>LST is the only 0 fee LST.</p>
                </div>
              </div>
            </>
          )}
          {variant === LSTDialogVariants.SOL && (
            <>
              <h2 className="text-2xl font-bold">Stake for LST?</h2>
              <div className="space-y-4">
                <p>The highest natural yield available from any LST on Solana. By a lot.</p>
                <div className="text-[#DCE85D] space-y-2 font-bold">
                  <p>LST is the only 8% yielding LST.</p>
                  <p>LST is the only 0% commission LST.</p>
                  <p>LST is the only 0 fee LST.</p>
                </div>
              </div>
            </>
          )}
          <div className="flex flex-col space-y-4 mt-3">
            <Link href={variant === LSTDialogVariants.stSOL ? "/stake?deposit=stSOL" : "/stake"}>
              <Button className="bg-white text-[#020815] normal-case mx-auto px-4 hover:bg-white/80">Mint LST</Button>
            </Link>
            <Button variant="link" onClick={() => onClose()} className="text-muted-foreground">
              No thanks, continue
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { LSTDialog };
