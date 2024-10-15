import React from "react";

import Image from "next/image";

import { IconX } from "@tabler/icons-react";
import { ActionBox, useWallet } from "@mrgnlabs/mrgn-ui";
import { capture } from "@mrgnlabs/mrgn-utils";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { Button } from "~/components/ui/button";
import { useMrgnlendStore } from "~/store";

type NewAssetBannerProps = {
  bankInfo: ExtendedBankInfo;
};

export const NewAssetBanner = ({ bankInfo }: NewAssetBannerProps) => {
  const [fetchMrgnlendState] = useMrgnlendStore((state) => [state.fetchMrgnlendState]);
  const { connected } = useWallet();
  const [isBannerVisible, setIsBannerVisible] = React.useState(false);

  const handleBannerAcknowledgement = React.useCallback(() => {
    window.sessionStorage.setItem("mrgnNewAssetBannerAcknowledged", "true");
    setIsBannerVisible(false);
  }, []);

  React.useEffect(() => {
    if (window.sessionStorage.getItem("mrgnNewAssetBannerAcknowledged") !== "true") {
      setIsBannerVisible(true);
    }
  }, []);

  if (!isBannerVisible) return null;

  return (
    <div className="bg-muted text-white/80 py-4 pl-5 pr-12 rounded-sm max-w-fit relative">
      <div className="flex gap-6 items-center">
        <div className="mr-auto flex items-start">
          <Image src={bankInfo.meta.tokenLogoUri} alt={bankInfo.meta.tokenSymbol} width={50} height={50} />
        </div>
        <div className="space-y-2.5">
          <h2 className="font-medium">${bankInfo.meta.tokenSymbol} is now available on marginfi</h2>
          <ul className="flex items-center gap-2 justify-center">
            <li className="w-full">
              <ActionBox.Lend
                isDialog={true}
                useProvider={true}
                lendProps={{
                  connected: connected,
                  requestedLendType: ActionType.Deposit,
                  requestedBank: bankInfo,
                  captureEvent: (event, properties) => {
                    capture(event, properties);
                  },
                  onComplete: () => {
                    fetchMrgnlendState();
                  },
                }}
                dialogProps={{
                  title: `Deposit ${bankInfo.meta.tokenSymbol}`,
                  trigger: (
                    <Button variant="outline-dark" size="sm" className="w-full">
                      Deposit ${bankInfo.meta.tokenSymbol}
                    </Button>
                  ),
                }}
              />
            </li>
            <li className="w-full">
              <ActionBox.Lend
                isDialog={true}
                useProvider={true}
                lendProps={{
                  connected: connected,
                  requestedLendType: ActionType.Borrow,
                  requestedBank: bankInfo,
                  captureEvent: (event, properties) => {
                    capture(event, properties);
                  },
                  onComplete: () => {
                    fetchMrgnlendState();
                  },
                }}
                dialogProps={{
                  title: `Deposit ${bankInfo.meta.tokenSymbol}`,
                  trigger: (
                    <Button variant="outline-dark" size="sm" className="w-full">
                      Borrow ${bankInfo.meta.tokenSymbol}
                    </Button>
                  ),
                }}
              />
            </li>
          </ul>
        </div>
      </div>
      <button className="absolute top-3 right-3" onClick={handleBannerAcknowledgement}>
        <IconX className="text-white/80" size={16} />
      </button>
    </div>
  );
};

type NewAssetBannerListProps = {
  banks: ExtendedBankInfo[];
};

export const NewAssetBannerList = ({ banks }: NewAssetBannerListProps) => {
  return (
    <div className="flex flex-wrap items-center gap-4 mb-8">
      {banks.map((bank) => (
        <NewAssetBanner key={bank.meta.tokenSymbol} bankInfo={bank} />
      ))}
    </div>
  );
};
