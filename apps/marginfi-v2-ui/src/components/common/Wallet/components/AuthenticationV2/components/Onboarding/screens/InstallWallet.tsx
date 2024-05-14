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

interface props extends OnrampScreenProps {}

export const InstallWallet: React.FC<props> = ({
  isLoading,
  installingWallet,
  isActiveLoading,
  setIsLoading,
  setIsActiveLoading,
  loginWeb3Auth,
  select,
}: props) => {
  const wallets = useAvailableWallets("social");
  const { push, reload } = useRouter();

  const selectedWallet = React.useMemo(
    () => wallets.find((wallet) => wallet.adapter.name === installingWallet),
    [wallets, installingWallet]
  );

  if (!selectedWallet) {
    return <></>;
  }

  const onPageRefresh = () => {
    push(`/?onboard=${installingWallet}`).then(() => {
      reload();
    });
  };

  return (
    <div className="w-full space-y-6 ">
      <div
        className={cn(
          "relative bg-muted flex flex-col gap-4 justify-center text-muted-foreground transition-all duration-300 w-full p-4 rounded-lg"
        )}
      >
        <div className="mx-auto">
          <Image src={selectedWallet.adapter.icon} width={32} height={32} alt={selectedWallet.adapter.name} />
        </div>
        <p className="flex justify-center gap-2">
          Installing {installingWallet} wallet. <br />
          Press refresh when you&apos;ve completed the installation setup.
        </p>
        <div className="mx-auto">
          <Button onClick={() => onPageRefresh()}>Refresh</Button>
        </div>
      </div>
    </div>
  );
};
