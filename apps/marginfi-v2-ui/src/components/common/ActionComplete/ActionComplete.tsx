import React from "react";

import Confetti from "react-confetti";
import { useWindowSize } from "@uidotdev/usehooks";

import { cn } from "~/utils";
import { useUiStore } from "~/store";

import { Dialog, DialogContent } from "~/components/ui/dialog";

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
        }, 5000);
      }, 1000);
    }
  }, [isActionComplete]);

  if (!isActionComplete) return null;

  return (
    <div>
      <div />
      <Confetti
        width={width!}
        height={height! * 2}
        className={cn("z-[60] opacity-0 transition-opacity duration-500", isConfetti && "opacity-50")}
      />
      <Dialog open={isActionComplete} onOpenChange={(open) => setIsActionComplete(open)}>
        <DialogContent className="z-[70]">Yay!</DialogContent>
      </Dialog>
    </div>
  );
};
