import React from "react";

import Link from "next/link";
import Image from "next/image";

import { IconExternalLink } from "@tabler/icons-react";
import { PublicKey } from "@solana/web3.js";

import { percentFormatter } from "@mrgnlabs/mrgn-common";
import { useExtendedBanks, useLstRates, useEmissionsRates } from "@mrgnlabs/mrgn-state";
import { cn } from "@mrgnlabs/mrgn-utils";

import { IMAGE_CDN_URL } from "~/config/constants";
import { useDebounce } from "~/hooks/useDebounce";
import { getRateData } from "~/bank-data.utils";

import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";

const SOL_MINT = "So11111111111111111111111111111111111111112";
const JTO_MINT = "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn";
const USDS_MINT = "USDSwr9ApdHk5bvJKMjzff41FfuX8bSxdKcR81vTwcA";

type CampaignType = "jito" | "usds";

const EmissionsPopover = ({ rateAPY, campaign }: { rateAPY: number; campaign: CampaignType }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [shouldClose, setShouldClose] = React.useState(false);
  const debouncedShouldClose = useDebounce(shouldClose, 300);
  const { data: ratesData, isLoading: isRatesLoading } = useEmissionsRates();
  const { extendedBanks, isLoading: isExtendedBanksLoading } = useExtendedBanks();
  const { data: lstRates } = useLstRates();

  const solBank = extendedBanks?.find((bank) => bank.info.state.mint.equals(new PublicKey(SOL_MINT)));
  const jitoSolBank = extendedBanks?.find((bank) => bank.info.state.mint.equals(new PublicKey(JTO_MINT)));
  const solRateData = solBank ? getRateData(solBank, false) : null;
  const jitoSolRateData = jitoSolBank ? getRateData(jitoSolBank, true) : null;
  const jitoSolLstRate = lstRates?.get(jitoSolBank?.info.state.mint.toBase58() ?? "") || 0;

  // Get campaign-specific data
  const campaignData = campaign === "jito" ? ratesData?.jito : ratesData?.usds;

  const netAPY =
    campaign === "jito" && jitoSolRateData && solRateData && campaignData
      ? jitoSolRateData?.rateAPY - solRateData?.rateAPY + campaignData.annualized_rate_enhancement + jitoSolLstRate
      : null;

  const handleMouseEnter = React.useCallback(() => {
    setShouldClose(false);
    setIsOpen(true);
  }, []);

  const handleMouseLeave = React.useCallback(() => {
    setShouldClose(true);
  }, []);

  React.useEffect(() => {
    if (debouncedShouldClose) {
      setIsOpen(false);
      setShouldClose(false);
    }
  }, [debouncedShouldClose]);

  if (!campaignData) return <p>{percentFormatter.format(rateAPY)}</p>;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className="outline-none">
        <p className="text-right">{percentFormatter.format(rateAPY)}</p>
        <div className="flex items-center gap-1 justify-end">
          <p className="text-xs text-blue-400">
            +{percentFormatter.format(campaignData?.annualized_rate_enhancement || 0)}
          </p>
          <div className="flex items-center -space-x-1.5">
            {campaign === "jito" ? (
              <>
                <Image
                  src={`${IMAGE_CDN_URL}/${JTO_MINT}.png`}
                  alt="info"
                  height={12}
                  width={12}
                  className="rounded-full"
                />
                <Image
                  src={`${IMAGE_CDN_URL}/SOL.png`}
                  alt="info"
                  height={13}
                  width={13}
                  className="rounded-full border border-muted-foreground/70"
                />
              </>
            ) : (
              <Image
                src={`${IMAGE_CDN_URL}/${USDS_MINT}.png`}
                alt="info"
                height={12}
                width={12}
                className="rounded-full"
              />
            )}
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent side="top" className="w-80 p-4" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center -space-x-2">
              {campaign === "jito" ? (
                <>
                  <Image
                    src={`${IMAGE_CDN_URL}/${JTO_MINT}.png`}
                    alt="info"
                    height={20}
                    width={20}
                    className="rounded-full"
                  />
                  <Image
                    src={`${IMAGE_CDN_URL}/SOL.png`}
                    alt="info"
                    height={20}
                    width={20}
                    className="rounded-full border border-muted-foreground/70"
                  />
                </>
              ) : (
                <Image
                  src={`${IMAGE_CDN_URL}/${USDS_MINT}.png`}
                  alt="info"
                  height={20}
                  width={20}
                  className="rounded-full"
                />
              )}
            </div>
            <h3 className="font-medium">{campaign === "jito" ? "JitoSOL / SOL Pair Incentives" : "USDS Incentives"}</h3>
          </div>

          <dl className="grid grid-cols-2 gap-4 text-sm w-full">
            <dt className="flex items-center gap-1">
              {campaign === "jito" ? (
                <>
                  <Image
                    src={`${IMAGE_CDN_URL}/jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL.png`}
                    alt="JTO"
                    height={18}
                    width={18}
                    className="rounded-full"
                  />{" "}
                  JTO Emissions
                </>
              ) : (
                <>USDS Emissions</>
              )}
            </dt>
            <dd className="text-right text-mrgn-success">
              +{percentFormatter.format(campaignData?.annualized_rate_enhancement || 0)}
            </dd>
          </dl>

          {campaign === "jito" ? (
            <dl className="grid grid-cols-2 gap-y-2 text-xs w-full text-muted-foreground">
              <dt>JitoSOL Lending Rate</dt>
              <dd className="text-mrgn-success text-right">{percentFormatter.format(jitoSolRateData?.rateAPY || 0)}</dd>
              <dt>JitoSOL Staking Rate</dt>
              <dd className="text-mrgn-success text-right">{percentFormatter.format(jitoSolLstRate || 0)}</dd>
              <dt>SOL Borrowing Rate</dt>
              <dd className="text-mrgn-warning text-right">{percentFormatter.format(solRateData?.rateAPY || 0)}</dd>
              <dt className="border-y border-muted-foreground/20 py-2 text-primary">Net JitoSOL / SOL APY</dt>
              <dd
                className={cn(
                  "text-right border-y border-muted-foreground/20 py-2",
                  netAPY && netAPY > 0 ? "text-mrgn-success" : "text-mrgn-warning"
                )}
              >
                {percentFormatter.format(netAPY || 0)}
              </dd>
            </dl>
          ) : (
            <dl className="grid grid-cols-2 gap-y-2 text-xs w-full text-muted-foreground">
              <dt>USDS Lending Rate</dt>
              <dd className="text-mrgn-success text-right">{percentFormatter.format(rateAPY || 0)}</dd>
              <dt className="border-y border-muted-foreground/20 py-2 text-primary">USDS APY</dt>
              <dd className="text-right border-y border-muted-foreground/20 py-2 text-mrgn-success">
                {percentFormatter.format((rateAPY || 0) + (campaignData?.annualized_rate_enhancement || 0))}
              </dd>
            </dl>
          )}

          <div className="text-xs space-y-2 mt-2">
            <p className="leading-relaxed text-muted-foreground">
              {campaign === "jito"
                ? "JTO emissions are distributed weekly to users who are lending JitoSOL and borrowing SOL. Emissions rates are approximations."
                : "USDS emissions are distributed to users who are lending USDS. Emissions rates are approximations."}
            </p>
            <Link
              href="https://docs.marginfi.com/introduction#borrow-incentives-explained"
              target="_blank"
              rel="noreferrer"
              className="inline-block transition-colors hover:text-primary"
            >
              Read more <IconExternalLink size={14} className="inline -translate-y-[1px]" />
            </Link>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export { EmissionsPopover };
