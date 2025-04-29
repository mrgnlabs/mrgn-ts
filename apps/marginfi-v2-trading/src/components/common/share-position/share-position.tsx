import React from "react";

import { IconCheck, IconCopy, IconDownload, IconShare } from "@tabler/icons-react";
import { PublicKey } from "@solana/web3.js";
import { dynamicNumeralFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";
import { cn, useIsMobile, useBrowser } from "@mrgnlabs/mrgn-utils";

import { ArenaPoolV2Extended } from "~/types/trade-store.types";
import { usePositionsData } from "~/hooks/usePositionsData";
import { useLeveragedPositionDetails } from "~/hooks/arenaHooks";

import { generateImage, copyImage, downloadImage } from "~/components/common/share-position";
import { PnlLabel, PnlBadge } from "~/components/common/pnl-display";
import { Dialog, DialogContent, DialogFooter, DialogTrigger } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";

interface SharePositionProps {
  pool: ArenaPoolV2Extended;
  triggerVariant?:
    | "ghost"
    | "link"
    | "default"
    | "destructive"
    | "outline"
    | "outline-dark"
    | "secondary"
    | "long"
    | "short"
    | null
    | undefined;
  triggerClassName?: string;
  onOpenChange?: (open: boolean) => void;
}

const SharePosition = ({ pool, triggerVariant = "ghost", triggerClassName, onOpenChange }: SharePositionProps) => {
  const [isCopied, setIsCopied] = React.useState(false);
  const [isDownloaded, setIsDownloaded] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const [shareType, setShareType] = React.useState<"$" | "%">("%");
  const cardRef = React.useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const browser = useBrowser();
  const positionData = usePositionsData({ groupPk: pool?.groupPk || PublicKey.default });
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

  if (browser === "Phantom" || browser === "Solflare" || browser === "Backpack") {
    return null;
  }

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
        <Button size="sm" variant={triggerVariant} className={cn("max-w-fit", triggerClassName)}>
          <IconShare size={16} />
          Share your position
        </Button>
      </DialogTrigger>
      <DialogContent className="p-4 md:p-12">
        {isOpen && (
          <>
            <div ref={cardRef} className="w-[480px] h-[250px] max-w-full relative">
              {/* Next Image causes issues with html to image capture */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/sharing/share-position-bg.png"
                alt="arena bg"
                width={480}
                height={250}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-0 left-0 w-full h-full">
                <div className={cn("pt-14 px-6 flex justify-between w-full gap-2", shareType === "%" && "pt-20")}>
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
                  {!process.env.NEXT_PUBLIC_HIDE_ARENA_FEATURES && (
                    <div className={cn("flex flex-col items-end gap-1", shareType === "$" && "-translate-y-2")}>
                      {shareType === "$" && <PnlBadge pnl={positionData?.pnl ?? 0} positionSize={positionSizeUsd} />}
                      <PnlLabel
                        type={shareType}
                        pnl={positionData?.pnl ?? 0}
                        positionSize={positionSizeUsd}
                        showTooltip={false}
                        className="text-4xl"
                      />
                    </div>
                  )}
                </div>
                <dl className="absolute bottom-0 left-0 pb-2 px-6 w-full grid grid-cols-2 gap-1">
                  <dt className="text-sm text-muted-foreground">Leverage</dt>
                  <dd className="text-base font-medium text-right">{`${leverage}x`}</dd>
                  {shareType === "$" && (
                    <>
                      <dt className="text-sm text-muted-foreground">Size</dt>
                      <dd className="text-base font-medium text-right">{usdFormatter.format(positionSizeUsd)}</dd>
                    </>
                  )}
                  <dt className="text-sm text-muted-foreground">Entry price</dt>
                  <dd className="text-base font-medium text-right">
                    $
                    {dynamicNumeralFormatter(positionData?.entryPrice, {
                      tokenPrice: positionData?.entryPrice,
                      ignoreMinDisplay: true,
                    })}
                  </dd>
                  <dt className="text-sm text-muted-foreground">Market price</dt>
                  <dd className="text-base font-medium text-right">
                    $
                    {dynamicNumeralFormatter(pool.tokenBank.info.oraclePrice.priceRealtime.price.toNumber(), {
                      tokenPrice: pool.tokenBank.info.oraclePrice.priceRealtime.price.toNumber(),
                      ignoreMinDisplay: true,
                    })}
                  </dd>
                </dl>
              </div>
            </div>
            <DialogFooter className="flex flex-col sm:flex-col gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="shareType"
                  checked={shareType === "$"}
                  onCheckedChange={() => setShareType(shareType === "$" ? "%" : "$")}
                />
                <Label htmlFor="shareType">Show USD</Label>
              </div>
              <div className="flex items-center gap-4 w-full">
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
                <p className="flex items-center gap-1.5 text-sm text-mrgn-green">
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
