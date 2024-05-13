import Image from "next/image";

import { OnrampScreenProps, cn, socialProviders, walletIcons } from "~/utils";

import { WalletAuthButton, WalletAuthEmailForm, WalletSeperator } from "../../sharedComponents";
import { useAvailableWallets } from "~/hooks/useAvailableWallets";

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
  return (
    <div className="w-full space-y-6 ">
      <div
        className={cn(
          "relative bg-muted text-muted-foreground transition-all duration-300 w-full p-4 rounded-lg overflow-hidden max-h-none"
        )}
      >
        Installing wallet {installingWallet}
      </div>
    </div>
  );
};
