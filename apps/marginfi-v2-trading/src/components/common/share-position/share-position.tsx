import React from "react";

import Image from "next/image";

import { toPng } from "html-to-image";
import { IconCopy, IconDownload, IconShare } from "@tabler/icons-react";
import { dynamicNumeralFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";

import { ArenaPoolV2Extended } from "~/types/trade-store.types";
import { usePositionsData } from "~/hooks/usePositionsData";
import { useLeveragedPositionDetails } from "~/hooks/arenaHooks";
import { PnlLabel, PnlBadge } from "~/components/common/pnl-display";

import { Dialog, DialogContent, DialogTrigger } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";

interface SharePositionProps {
  pool: ArenaPoolV2Extended;
  onOpenChange?: (open: boolean) => void;
}

const SharePosition = ({ pool, onOpenChange }: SharePositionProps) => {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const positionData = usePositionsData({ groupPk: pool.groupPk });
  const { positionSizeUsd, leverage } = useLeveragedPositionDetails({ pool });

  const captureImage = () => {
    if (!cardRef.current) return;
    toPng(cardRef.current)
      .then((dataUrl) => {
        // Copy to clipboard on desktop
        if (navigator.clipboard) {
          fetch(dataUrl)
            .then((res) => res.blob())
            .then((blob) => navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]))
            .then(() => alert("Image copied to clipboard!"));
        }

        // Trigger native share on mobile
        if (navigator.share) {
          navigator.share({
            title: "Check out my trade!",
            text: "My trade position and PnL",
            files: [new File([dataUrl], "trade.png", { type: "image/png" })],
          });
        }
      })
      .catch((err) => console.error("Error capturing image:", err));
  };

  return (
    <Dialog onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="" onClick={() => {}}>
          <IconShare size={16} />
          Share your position
        </Button>
      </DialogTrigger>
      <DialogContent>
        <div ref={cardRef} className="w-[480px] h-[250px] relative">
          <Image src="/sharing/share-position-bg.png" alt="arena bg" width={480} height={250} />
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="pt-14 px-6 flex justify-between w-full gap-2">
              <div className="flex items-center gap-2 text-xl">
                <Image
                  src={pool.tokenBank.meta.tokenLogoUri}
                  alt={pool.tokenBank.meta.tokenSymbol}
                  width={42}
                  height={42}
                  className="rounded-full"
                />
                {pool.tokenBank.meta.tokenSymbol}
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">PnL</span>
                  <PnlBadge pnl={positionData?.pnl} positionSize={positionSizeUsd} />
                </div>
                <PnlLabel pnl={positionData?.pnl} className="text-4xl" />
              </div>
            </div>
            <dl className="absolute bottom-0 left-0 pb-2 px-6 w-full grid grid-cols-2 gap-1">
              <dt className="text-sm text-muted-foreground">Leverage</dt>
              <dd className="text-base font-medium text-right">{`${leverage}x`}</dd>
              <dt className="text-sm text-muted-foreground">Size</dt>
              <dd className="text-base font-medium text-right">{usdFormatter.format(positionSizeUsd)}</dd>
              <dt className="text-sm text-muted-foreground">Entry price</dt>
              <dd className="text-base font-medium text-right">${dynamicNumeralFormatter(positionData?.entryPrice)}</dd>
              <dt className="text-sm text-muted-foreground">Market price</dt>
              <dd className="text-base font-medium text-right">
                ${dynamicNumeralFormatter(pool.tokenBank.info.oraclePrice.priceRealtime.price.toNumber())}
              </dd>
            </dl>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full">
          <Button variant="outline" onClick={captureImage} className="w-full">
            <IconCopy size={16} />
            Copy
          </Button>
          <Button variant="outline" onClick={captureImage} className="w-full">
            <IconDownload size={16} />
            Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { SharePosition };
