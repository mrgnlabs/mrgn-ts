import React from "react";

import { WalletButton } from "~/components/common/Wallet";

export const PointsConnectWallet = () => {
  return (
    <div className="max-w-[800px] p-4 mx-auto w-full bg-background-gray-dark rounded-xl mt-8 md:mt-0">
      <div className="w-full flex flex-col gap-4 justify-evenly items-center p-2 text-base text-white font-aeonik font-[400] rounded-xl text-center">
        <h2 className="text-2xl font-medium">Sign in to access your points</h2>
        <WalletButton />
      </div>
    </div>
  );
};
