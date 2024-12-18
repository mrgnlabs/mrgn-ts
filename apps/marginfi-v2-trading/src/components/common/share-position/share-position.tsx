import React from "react";

import Image from "next/image";

import { IconCheck, IconCopy, IconDownload, IconShare } from "@tabler/icons-react";
import { dynamicNumeralFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";
import { useIsMobile } from "@mrgnlabs/mrgn-utils";

import { ArenaPoolV2Extended } from "~/types/trade-store.types";
import { usePositionsData } from "~/hooks/usePositionsData";
import { useLeveragedPositionDetails } from "~/hooks/arenaHooks";
import { generateImage, copyImage, downloadImage } from "~/components/common/share-position";

import { PnlLabel, PnlBadge } from "~/components/common/pnl-display";
import { Dialog, DialogContent, DialogFooter, DialogTrigger } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";

interface SharePositionProps {
  pool: ArenaPoolV2Extended;
  onOpenChange?: (open: boolean) => void;
}

const SharePosition = ({ pool, onOpenChange }: SharePositionProps) => {
  const [isCopied, setIsCopied] = React.useState(false);
  const [isDownloaded, setIsDownloaded] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const positionData = usePositionsData({ groupPk: pool.groupPk });
  const { positionSizeUsd, leverage } = useLeveragedPositionDetails({ pool });

  const handleCopyImage = async () => {
    const dataUrl = await generateImage(cardRef.current);
    if (!dataUrl) return;

    await copyImage(dataUrl, isMobile, () => {
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 3000);
    });
  };

  const handleDownloadImage = async () => {
    const dataUrl = await generateImage(cardRef.current);
    if (!dataUrl) return;

    downloadImage(dataUrl, pool.tokenBank.meta.tokenSymbol, () => {
      setTimeout(() => {
        setIsDownloaded(true);
      }, 1000);
      setTimeout(() => {
        setIsDownloaded(false);
      }, 5000);
    });
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          setIsCopied(false);
        }
        onOpenChange?.(open);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <IconShare size={16} />
          Share your position
        </Button>
      </DialogTrigger>
      <DialogContent>
        {isOpen && (
          <>
            <div ref={cardRef} className="w-[480px] h-[250px] relative">
              {/* Next Image causes issues with html to image capture */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/sharing/share-position-bg.png" alt="arena bg" width={480} height={250} />
              <div className="absolute top-0 left-0 w-full h-full">
                <div className="pt-14 px-6 flex justify-between w-full gap-2">
                  <div className="flex items-center gap-2 text-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pool.tokenBank.meta.tokenLogoUri}
                      alt={pool.tokenBank.meta.tokenSymbol}
                      width={42}
                      height={42}
                      className="rounded-full"
                    />
                    {pool.tokenBank.meta.tokenSymbol}
                  </div>
                  <div className="flex flex-col items-end gap-1 -translate-y-2">
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
                  <dd className="text-base font-medium text-right">
                    ${dynamicNumeralFormatter(positionData?.entryPrice)}
                  </dd>
                  <dt className="text-sm text-muted-foreground">Market price</dt>
                  <dd className="text-base font-medium text-right">
                    ${dynamicNumeralFormatter(pool.tokenBank.info.oraclePrice.priceRealtime.price.toNumber())}
                  </dd>
                </dl>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-col items-center gap-4">
              <div className="flex items-center gap-3 w-full">
                <Button variant="outline" onClick={handleCopyImage} className="w-full">
                  {isCopied ? (
                    <>
                      <IconCheck size={16} />
                      Image copied!
                    </>
                  ) : (
                    <>
                      <IconShare size={16} />
                      Share on social
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleDownloadImage} className="w-full">
                  {isDownloaded ? (
                    <>
                      <IconCheck size={16} />
                      Downloaded!
                    </>
                  ) : (
                    <>
                      <IconDownload size={16} />
                      Download
                    </>
                  )}
                </Button>
              </div>
              {(isCopied || isDownloaded) && (
                <p className="flex items-center gap-1.5 text-sm text-mrgn-success">
                  <IconCopy size={14} /> Image {isCopied ? "copied" : "downloaded"}, now share on social.
                </p>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export { SharePosition };
