import { OnrampScreenProps, cn, socialProviders } from "~/utils";
import { WalletAuthButton, WalletAuthEmailForm, WalletSeperator } from "../../sharedComponents";
import { Bridge } from "~/components/common/Bridge";

interface props extends OnrampScreenProps {}

export const BridgeToken: React.FC<props> = ({
  isLoading,
  isActiveLoading,
  setIsLoading,
  setIsActiveLoading,
  loginWeb3Auth,
}: props) => {
  return (
    <div className="w-full space-y-6 mt-8">
      <div
        className={cn(
          "relative bg-muted text-muted-foreground transition-all duration-300 w-full p-6 pt-5 rounded-lg overflow-hidden max-h-none"
        )}
      >
        <Bridge />
      </div>
    </div>
  );
};
