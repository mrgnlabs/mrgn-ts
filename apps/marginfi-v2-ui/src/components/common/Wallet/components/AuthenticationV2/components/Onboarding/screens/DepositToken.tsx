import Image from "next/image";

import { OnrampScreenProps, cn, socialProviders, walletIcons } from "~/utils";

import { WalletAuthButton, WalletAuthEmailForm, WalletSeperator } from "../../sharedComponents";
import { useAvailableWallets } from "~/hooks/useAvailableWallets";
import React from "react";
import { IconCheck, IconLoader } from "~/components/ui/icons";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { Button } from "~/components/ui/button";
import { useUiStore } from "~/store";
import { useRouter } from "next/router";
import Swap from "~/pages/swap";

interface props extends OnrampScreenProps {}

export const DepositToken = ({
  isLoading,
  installingWallet,
  isActiveLoading,
  setIsLoading,
  setIsActiveLoading,
  loginWeb3Auth,
  select,
  onNext,
}: props) => {
  return (
    <div className="w-full space-y-6 ">
      <div
        className={cn(
          "relative bg-muted flex flex-col gap-4 justify-center text-muted-foreground transition-all duration-300 w-full p-4 rounded-lg"
        )}
      >
        {/* <Swap /> */}
        <div className="mx-auto">Mesa onramp coming soon!</div>

        <WalletSeperator description="skip for now" onClick={() => onNext()} />
      </div>
    </div>
  );
};
