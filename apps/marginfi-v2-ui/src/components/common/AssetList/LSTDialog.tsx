import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button, Dialog, DialogContent } from "@mui/material";
import { useMrgnlendStore } from "~/store";

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

  const tokenImage = useMemo(() => {
    const bank = sortedBanks.find((bank) => bank.meta.tokenSymbol === variant);
    if (!bank) return null;

    return bank.meta.tokenLogoUri;
  }, [variant, sortedBanks]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      PaperProps={{
        style: {
          backgroundColor: "transparent",
          boxShadow: "none",
        },
      }}
    >
      <DialogContent className="bg-[#171C1F] w-full rounded-lg text-white items-center justify-center text-center py-16">
        <div className="w-full lg:min-w-[900px]">
          <div className="max-w-[540px] mx-auto flex flex-col gap-6">
            {tokenImage && (
              <div className="flex items-center justify-center">
                <Image
                  src={tokenImage}
                  alt={tokenImage}
                  height={80}
                  width={80}
                  className="rounded-full translate-x-4 drop-shadow-lg"
                />
                <Image
                  src="https://storage.googleapis.com/static-marginfi/lst.png"
                  alt="lst"
                  height={80}
                  width={80}
                  className="rounded-full -translate-x-4 drop-shadow-lg"
                />
              </div>
            )}
            {variant === LSTDialogVariants.stSOL && (
              <>
                <h2 className="text-2xl font-bold">Swap stSOL for LST?</h2>
                <p>
                  Lido{" "}
                  <a
                    href="https://snapshot.org/#/lido-snapshot.eth/proposal/0x37c958cfa873f6b2859b280bc4165fbdf15b1141b62844712af3338d5893c6c8"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#DCE85D] border-b border-transparent transition hover:border-[#DCE85D]"
                  >
                    proposal on the future of stSOL
                  </a>{" "}
                  is currently at 92% in favor of sunsetting. Swap your stSOL for LST now and earn higher yield.
                </p>
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
              <Link href="/stake">
                <Button className="bg-white text-[#020815] normal-case mx-auto px-4 hover:bg-white/80">Mint LST</Button>
              </Link>
              <button
                className=" border-white/50 text-white/50 transition hover:border-white hover:text-white mx-auto text-sm"
                onClick={() => onClose()}
              >
                No thanks, continue
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { LSTDialog };
