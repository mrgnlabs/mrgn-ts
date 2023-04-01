import React, { FC } from "react";
import { useUserAccounts } from "~/context";
import { ProductScreensSuperstake } from "~/components/Swap/ProductScreens";

const SwapUI: FC = () => {
  const { selectedAccount } = useUserAccounts();

  return (
    <div className="p-4 mt-2 w-full relative">
      <div className="h-[320px] w-[400px] flex flex-col items-center justify-between mx-auto rounded-2xl px-10 py-8 bg-[#0E1113] border-2 border-[#1C2125] gap-2">
        <div className="absolute top-[140px]">          
        </div>
        <div className="h-full gap-1">
          <ProductScreensSuperstake />
        </div>
      </div>
    </div>
  );
};

export default SwapUI;
