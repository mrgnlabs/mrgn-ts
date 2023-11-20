import React from "react";
import Image from "next/image";
import { Button } from "~/components/ui/button";
import { IconX } from "~/components/ui/icons";

type NewAssetBannerProps = {
  asset: string;
  image: string;
};

export const NewAssetBanner = ({ asset, image }: NewAssetBannerProps) => {
  const assetTicker = React.useMemo(() => "$" + asset.toUpperCase(), [asset]);

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
              <Button variant="outline" size="sm" className="w-full">
                Deposit {assetTicker}
              </Button>
            </li>
            <li className="w-full">
              <Button variant="outline" size="sm" className="w-full">
                Borrow {assetTicker}
              </Button>
            </li>
          </ul>
        </div>
      </div>
      <button className="absolute top-3 right-3">
        <IconX className="text-white/80" size={16} />
      </button>
    </div>
  );
};

type NewAssetBannerListProps = {
  assets: {
    asset: string;
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
