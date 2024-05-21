import React from "react";
import { useRouter } from "next/router";
import Image from "next/image";

import { OnrampScreenProps } from "~/utils";
import { useAvailableWallets } from "~/hooks/useAvailableWallets";
import { Button } from "~/components/ui/button";

import { ScreenWrapper } from "../../sharedComponents";

interface props extends OnrampScreenProps {}

export const InstallWallet: React.FC<props> = ({ installingWallet }: props) => {
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
    push(`/?onramp=${installingWallet}`).then(() => {
      reload();
    });
  };

  return (
    <ScreenWrapper>
      <div className="mx-auto">
        <Image src={selectedWallet.adapter.icon} width={32} height={32} alt={selectedWallet.adapter.name} />
      </div>
      <p className="flex justify-center gap-2 text-center">
        Installing {installingWallet} wallet. <br />
        Press refresh when you&apos;ve completed the installation setup.
      </p>
      <div className="mx-auto">
        <Button onClick={() => onPageRefresh()}>Refresh</Button>
      </div>
    </ScreenWrapper>
  );
};
