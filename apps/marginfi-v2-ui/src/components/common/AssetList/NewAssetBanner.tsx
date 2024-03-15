import React from "react";

import Image from "next/image";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { LendingModes } from "~/types";
import { getTokenImageURL } from "~/utils";

import { ActionBoxDialog } from "../ActionBox";
import { Button } from "~/components/ui/button";
import { IconX } from "~/components/ui/icons";

type NewAssetBannerProps = {
  bankInfo: ExtendedBankInfo;
};

export const NewAssetBanner = ({ bankInfo }: NewAssetBannerProps) => {
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
          <Image
            src={getTokenImageURL(bankInfo.meta.tokenSymbol)}
            alt={bankInfo.meta.tokenSymbol}
            width={50}
            height={50}
          />
        </div>
        <div className="space-y-2.5">
          <h2 className="font-medium">${bankInfo.meta.tokenSymbol} is now available on marginfi</h2>
          <ul className="flex items-center gap-2 justify-center">
            <li className="w-full">
              <ActionBoxDialog requestedToken={bankInfo.address} requestedAction={ActionType.Deposit}>
                <Button variant="outline" size="sm" className="w-full">
                  Deposit ${bankInfo.meta.tokenSymbol}
                </Button>
              </ActionBoxDialog>
            </li>
            <li className="w-full">
              <ActionBoxDialog requestedToken={bankInfo.address} requestedAction={ActionType.Borrow}>
                <Button variant="outline" size="sm" className="w-full">
                  Borrow ${bankInfo.meta.tokenSymbol}
                </Button>
              </ActionBoxDialog>
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
