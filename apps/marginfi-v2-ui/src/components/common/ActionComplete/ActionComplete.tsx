import React from "react";

import Confetti from "react-confetti";
import { useWindowSize } from "@uidotdev/usehooks";

import { cn } from "~/utils";
import { useUiStore } from "~/store";

import { Dialog, DialogContent } from "~/components/ui/dialog";
import { IconCheck } from "~/components/ui/icons";
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
          <div className="space-y-12">
            <header className="space-y-3 text-center flex flex-col items-center justify-center">
              <img
                className="rounded-full w-16 h-16"
                src="https://app.marginfi.com/_next/image?url=https%3A%2F%2Fraw.githubusercontent.com%2Fsolana-labs%2Ftoken-list%2Fmain%2Fassets%2Fmainnet%2FSo11111111111111111111111111111111111111112%2Flogo.png&w=96&q=75"
              />
              <h2 className="font-medium text-xl">Deposit Complete</h2>
            </header>
            <div className="flex flex-col justify-center items-center">
              <h3 className="mb-2">Total supplied</h3>
              <p className="flex items-end gap-1.5 text-6xl font-medium">
                0.05 <span className="text-2xl">SOL</span>
              </p>
              <p className="text-2xl font-medium text-success/80">+0.01</p>
            </div>
            {/* </div> */}
            <div className="flex flex-col gap-3">
              <Button className="max-w-fit mx-auto">Deposit another token</Button>
              <button className="border-b border-white/80 max-w-fit mx-auto text-sm transition-colors hover:border-transparent">
                Continue
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
