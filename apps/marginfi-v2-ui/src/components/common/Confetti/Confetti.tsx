import Confetti from "react-confetti";
import { useWindowSize } from "@uidotdev/usehooks";

import { cn } from "~/utils";

import { useUiStore } from "~/store";

export const MrgnConfetti = () => {
  const [isActionSuccess, isActionSuccessShow] = useUiStore((state) => [
    state.isActionSuccess,
    state.isActionSuccessShow,
  ]);
  const { width, height } = useWindowSize();

  return (
    <Confetti
      width={width!}
      height={height! * 2}
      className={cn("z-[9999] opacity-0 transition-opacity duration-500", isActionSuccessShow && "opacity-100")}
      run={isActionSuccess}
    />
  );
};
