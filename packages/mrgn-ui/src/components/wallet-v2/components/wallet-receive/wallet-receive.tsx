import React from "react";

import QRCode from "react-qr-code";
import { IconCopy, IconCheck } from "@tabler/icons-react";
import { CopyToClipboard } from "react-copy-to-clipboard";

import { Button } from "~/components/ui/button";

type WalletReceiveProps = {
  address: string;
};

const WalletReceive = ({ address }: WalletReceiveProps) => {
  const [isCopied, setIsCopied] = React.useState(false);
  return (
    <div className="gap-6 text-center flex flex-col items-center pt-6 px-6">
      <p className="px-8">Scan the qr code with a wallet app or copy your address below.</p>
      <div className="border-8 border-background-gray-hover rounded-lg">
        <QRCode value={address} size={180} />
      </div>
      <div className="bg-background-gray border border-border text-primary rounded-md text-sm">
        <p className="break-all px-8 py-2 text-muted-foreground">{address}</p>
        <CopyToClipboard
          text={address}
          onCopy={() => {
            setIsCopied(true);
            setTimeout(() => {
              setIsCopied(false);
            }, 1000);
          }}
        >
          <Button variant="ghost" size="sm" className="w-full border-t h-10 border-border rounded-t-none">
            {isCopied ? (
              <>
                <IconCheck size={16} /> Copied!
              </>
            ) : (
              <>
                <IconCopy size={16} /> Copy address
              </>
            )}
          </Button>
        </CopyToClipboard>
      </div>
    </div>
  );
};

export { WalletReceive };
