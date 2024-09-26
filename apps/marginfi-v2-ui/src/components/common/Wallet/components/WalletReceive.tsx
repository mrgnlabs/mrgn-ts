import QRCode from "react-qr-code";
import { IconCopy } from "@tabler/icons-react";

import { Button } from "~/components/ui/button";

type WalletReceiveProps = {
  address: string;
  onBack: () => void;
};

const WalletReceive = ({ address, onBack }: WalletReceiveProps) => {
  return (
    <div className="gap-6 text-center flex flex-col items-center pt-6 px-6">
      <div className="border-8 border-primary rounded-lg">
        <QRCode value={address} />
      </div>
      <div className="bg-background-gray border border-border text-primary rounded-md">
        <p className="break-all p-4">{address}</p>
        <Button variant="ghost" className="w-full border-t border-border h-12 rounded-t-none">
          <IconCopy size={16} /> Copy address
        </Button>
      </div>
    </div>
  );
};

export { WalletReceive };
