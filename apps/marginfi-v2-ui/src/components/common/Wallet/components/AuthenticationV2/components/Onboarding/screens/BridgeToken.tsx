import { OnrampScreenProps } from "~/utils";
import { Bridge } from "~/components/common/Bridge";

import { ScreenWrapper, WalletSeperator } from "../../sharedComponents";

interface props extends OnrampScreenProps {}

export const BridgeToken: React.FC<props> = ({ onNext }: props) => {
  return (
    <ScreenWrapper>
      <div className="flex justify-center">
        <Bridge />
      </div>
      <WalletSeperator description="skip for now" onClick={() => onNext()} />
    </ScreenWrapper>
  );
};
