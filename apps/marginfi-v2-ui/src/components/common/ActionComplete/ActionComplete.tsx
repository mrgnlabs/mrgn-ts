import React from "react";

import Link from "next/link";

import Confetti from "react-confetti";
import { useWindowSize } from "@uidotdev/usehooks";

import { cn } from "~/utils";
import { useUiStore } from "~/store";

import { Dialog, DialogContent } from "~/components/ui/dialog";
import { IconConfetti, IconExternalLink } from "~/components/ui/icons";
import { Button } from "~/components/ui/button";

export const ActionComplete = () => {
  const [isActionComplete, setIsActionComplete] = useUiStore((state) => [
    state.isActionComplete,
    state.setIsActionComplete,
  ]);
  const { width, height } = useWindowSize();
  const [isConfetti, setIsConfetti] = React.useState(false);

  React.useEffect(() => {
    if (isActionComplete) {
      setTimeout(() => {
        setIsConfetti(true);

        setTimeout(() => {
          setIsConfetti(false);
        }, 8000);
      }, 1000);
    }
  }, [isActionComplete]);

  React.useEffect(() => {
    setIsActionComplete(true);
  }, []);

  if (!isActionComplete) return null;

  return (
    <div>
      <Confetti width={width!} height={height! * 2} recycle={false} opacity={0.4} className={cn("z-[60]")} />
      <Dialog open={isActionComplete} onOpenChange={(open) => setIsActionComplete(open)}>
        <DialogContent className="z-[70]">
          <div className="space-y-12 w-full">
            <header className="space-y-4 text-center flex flex-col items-center justify-center">
              <IconConfetti size={48} />
              <h2 className="font-medium text-xl">Deposit Completed!</h2>
            </header>
            <div className="flex flex-col items-center gap-2 border-b border-border pb-10">
              <div className="flex items-center justify-center gap-2">
                <h3 className="text-4xl font-medium">+ 40 SOL</h3>
                <img
                  className="rounded-full w-10 h-10"
                  src="https://app.marginfi.com/_next/image?url=https%3A%2F%2Fraw.githubusercontent.com%2Fsolana-labs%2Ftoken-list%2Fmain%2Fassets%2Fmainnet%2FSo11111111111111111111111111111111111111112%2Flogo.png&w=96&q=75"
                />
              </div>
            </div>
            <dl className="grid grid-cols-2 w-full text-muted-foreground gap-x-8 gap-y-2">
              <dt>Total SOL Deposits</dt>
              <dd className="text-right">100 SOL</dd>
              <dt>APY</dt>
              <dd className="text-right text-success">7%</dd>
              <dt>Transaction</dt>
              <dd className="text-right">
                <Link href="#" className="flex items-center justify-end gap-1 text-chartreuse">
                  abcd...fgbg <IconExternalLink size={18} />
                </Link>
              </dd>
            </dl>
            <Button className="w-full mx-auto">Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
