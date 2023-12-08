import React from "react";
import Image from "next/image";

import { useMrgnlendStore, useUiStore } from "~/store";

import { ActionBoxDialog } from "~/components/common/ActionBox";
import { Button } from "~/components/ui/button";
import { IconX } from "~/components/ui/icons";

import { LendingModes, PoolTypes, UserMode } from "~/types";

type NewAssetBannerProps = {
  asset: string;
  symbol: string;
  image: string;
};

export const NewAssetBanner = ({ asset, symbol, image }: NewAssetBannerProps) => {
  const [userMode, poolFilter, setLendingMode, setPoolFilter, setIsFilteredUserPositions, setSelectedToken] =
    useUiStore((state) => [
      state.userMode,
      state.poolFilter,
      state.setLendingMode,
      state.setPoolFilter,
      state.setIsFilteredUserPositions,
      state.setSelectedToken,
    ]);
  const [extendedBankInfos] = useMrgnlendStore((state) => [state.extendedBankInfos]);

  const renderBank = React.useMemo(
    () => extendedBankInfos.find((x) => x.meta.tokenSymbol === symbol),
    [extendedBankInfos]
  );

  const [isHidden, setIsHidden] = React.useState(true);

  const assetTicker = React.useMemo(() => "$" + asset.toUpperCase(), [asset]);

  const highlightAsset = React.useCallback(() => {
    if (!document) return;
    const assetRows = document.querySelectorAll("[data-asset-row]");
    const assetRow = document.querySelector(`[data-asset-row="${asset}"]`);
    console.log(asset, assetRow);
    if (!assetRow) return;

    assetRows.forEach((row) => row.classList.add("opacity-30", "hover:!bg-[#171C1F]"));
    assetRow.scrollIntoView({ behavior: "smooth", block: "center" });
    assetRow.classList.remove("opacity-30");
    assetRow.classList.add("animate-pulse");

    setTimeout(() => {
      assetRows.forEach((row) => row.classList.remove("opacity-30", "animate-pulse", "hover:bg-[#171C1F]"));
    }, 2500);
  }, [asset]);

  const deposit = React.useCallback(() => {
    setLendingMode(LendingModes.LEND);
    if (poolFilter !== PoolTypes.ALL) setPoolFilter(PoolTypes.ALL);
    setIsFilteredUserPositions(false);
    setTimeout(() => highlightAsset(), 100);
  }, [setLendingMode, poolFilter, setPoolFilter, asset, setIsFilteredUserPositions, highlightAsset]);

  const borrow = React.useCallback(() => {
    setLendingMode(LendingModes.BORROW);
    if (poolFilter !== PoolTypes.ALL) setPoolFilter(PoolTypes.ALL);
    setIsFilteredUserPositions(false);
    setTimeout(() => highlightAsset(), 100);
  }, [setLendingMode, poolFilter, setPoolFilter, asset, setIsFilteredUserPositions, highlightAsset]);

  const hideBanner = React.useCallback(() => {
    setIsHidden(true);
    localStorage.setItem("mrgnNewAssetAcknowledged", "true");
  }, [setIsHidden]);

  React.useEffect(() => {
    const isHidden = localStorage.getItem("mrgnNewAssetAcknowledged");
    if (!isHidden) setIsHidden(false);
  }, []);

  if (isHidden) return null;

  return (
    <div className="bg-muted text-white/80 py-4 pl-5 pr-12 rounded-sm max-w-fit relative">
      <div className="flex gap-6 items-center">
        <div className="mr-auto flex items-start">
          <Image src={image} alt={asset} width={50} height={50} />
        </div>
        <div className="space-y-2.5">
          <h2 className="font-medium">{assetTicker} is now available on margnfi</h2>
          <ul className="flex items-center gap-2 justify-center">
            <li className="w-full">
              {userMode === UserMode.LITE ? (
                <ActionBoxDialog>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      renderBank && setSelectedToken(renderBank);
                      setLendingMode(LendingModes.LEND);
                    }}
                  >
                    Deposit {assetTicker}
                  </Button>
                </ActionBoxDialog>
              ) : (
                <Button variant="outline" size="sm" className="w-full" onClick={() => deposit()}>
                  Deposit {assetTicker}
                </Button>
              )}
            </li>
            <li className="w-full">
              {userMode === UserMode.LITE ? (
                <ActionBoxDialog>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      renderBank && setSelectedToken(renderBank);
                      setLendingMode(LendingModes.BORROW);
                    }}
                  >
                    Borrow {assetTicker}
                  </Button>
                </ActionBoxDialog>
              ) : (
                <Button variant="outline" size="sm" className="w-full" onClick={() => borrow()}>
                  Borrow {assetTicker}
                </Button>
              )}
            </li>
          </ul>
        </div>
      </div>
      <button className="absolute top-3 right-3" onClick={hideBanner}>
        <IconX className="text-white/80" size={16} />
      </button>
    </div>
  );
};

type NewAssetBannerListProps = {
  assets: {
    asset: string;
    symbol: string;
    image: string;
  }[];
};

export const NewAssetBannerList = ({ assets }: NewAssetBannerListProps) => {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {assets.map((asset) => (
        <NewAssetBanner key={asset.asset} {...asset} />
      ))}
    </div>
  );
};
