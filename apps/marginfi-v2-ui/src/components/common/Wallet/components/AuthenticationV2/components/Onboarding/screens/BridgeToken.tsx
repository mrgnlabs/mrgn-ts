import { OnrampScreenProps, cn, socialProviders } from "~/utils";
import { WalletAuthButton, WalletAuthEmailForm, WalletSeperator } from "../../sharedComponents";
import { Bridge } from "~/components/common/Bridge";

interface props extends OnrampScreenProps {}

export const BridgeToken: React.FC<props> = ({ onNext }: props) => {
  return (
    <div className="w-full space-y-6 ">
      <div
        className={cn(
          "relative bg-muted flex flex-col gap-4 justify-center text-muted-foreground transition-all duration-300 w-full p-4 rounded-lg"
        )}
      >
        <div className="flex justify-center">
          <Bridge />
        </div>

        <WalletSeperator description="skip for now" onClick={() => onNext()} />
      </div>
    </div>
  );
};
