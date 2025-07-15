import React from "react";

import Image from "next/image";
import Link from "next/link";
import {
  aprToApy,
  dynamicNumeralFormatter,
  numeralFormatter,
  percentFormatter,
  percentFormatterMod,
  shortenAddress,
  usdFormatter,
} from "@mrgnlabs/mrgn-common";
import { IconAlertTriangle, IconExternalLink, IconInfoCircle, IconChartAreaLineFilled } from "@tabler/icons-react";

import {
  AssetData,
  AssetPriceData,
  AssetWeightData,
  BankCapData,
  cn,
  DepositsData,
  PositionData,
  RateData,
  UtilizationData,
  EMISSION_MINT_INFO_MAP,
} from "@mrgnlabs/mrgn-utils";

import { IMAGE_CDN_URL } from "~/config/constants";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, TooltipPortal } from "~/components/ui/tooltip";
import { IconPyth, IconSwitchboard } from "~/components/ui/icons";
import { PublicKey } from "@solana/web3.js";
import { Badge } from "~/components/ui/badge";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Table } from "~/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { EmodePopover } from "~/components/common/emode/components/emode-popover";
import { IconEmode } from "~/components/ui/icons";
import { BankChartDialog } from "~/components/common/bank/components/bank-chart-dialog";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { useDebounce } from "~/hooks/useDebounce";
import { useQuery } from "@tanstack/react-query";

export const getAssetCell = (asset: AssetData) => {
  return (
    <Link
      href={`/banks/${asset.address.toBase58()}`}
      className="flex gap-2 justify-start items-center group-hover:text-chartreuse"
      onClick={(e) => {
        const linkElement = e.currentTarget;
        const symbolDiv = linkElement.querySelector("div");
        if (symbolDiv) {
          symbolDiv.textContent = "Loading...";
          symbolDiv.classList.add("group-hover:text-white");
          linkElement.classList.add("animate-pulsate");
        }
      }}
    >
      <Image src={asset.image} alt={`${asset.symbol} logo`} height={25} width={25} className="rounded-full" />
      <div>{asset.symbol}</div>
      {asset.isReduceOnly && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <IconAlertTriangle size={14} className="text-destructive-foreground shrink-0" />
            </TooltipTrigger>
            <TooltipContent>This bank is in reduce-only mode.</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </Link>
  );
};

const formatPrice = (price: number) => {
  if (price >= 1) return usdFormatter.format(price);
  if (price >= 0.0000001) {
    return `$${dynamicNumeralFormatter(price, {
      minDisplay: 0.0000001,
      tokenPrice: price,
      forceDecimals: true,
    })}`;
  }
  if (price > 0) return `$${price.toExponential(2)}`;
  return 0;
};

export const getAssetPriceCell = ({
  oracle,
  assetPrice,
  assetPriceOffset,
  symbol,
  price,
  isOracleStale,
  isInLendingMode = true,
}: AssetPriceData) => (
  <div className="relative flex items-center justify-end gap-1.5">
    <div className="relative">
      {formatPrice(assetPrice)}
      {assetPriceOffset > assetPrice * 0.1 && (
        <div className="absolute top-[-8px] right-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="absolute text-xs">⚠️</div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex flex-col gap-2">
                  <h4 className="text-base">Wide oracle price bands</h4>
                  {`${symbol} price estimates is
              ${usdFormatter.format(price)} ± ${assetPriceOffset.toFixed(
                2
              )}, which is wide. Proceed with caution. marginfi prices assets at the bottom of confidence bands and liabilities at the top.`}
                  <br />
                  <a href="https://docs.marginfi.com">
                    <u>Learn more.</u>
                  </a>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
    {oracle && (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>{oracle === "Pyth" ? <IconPyth size={14} /> : <IconSwitchboard size={14} />}</div>
          </TooltipTrigger>
          <TooltipContent>Powered by {oracle}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )}
    {isOracleStale && (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <IconAlertTriangle size={14} className="text-warning shrink-0" />
          </TooltipTrigger>
          <TooltipContent className="space-y-3 max-w-[17rem]">
            <p>
              {isInLendingMode ? "Withdrawals from" : "Borrows from"} this bank may fail due to network congestion
              preventing oracles from updating price data.
            </p>
            <p>
              <Link
                href="https://docs.marginfi.com/faqs#what-does-the-stale-oracles-error-mean"
                target="_blank"
                rel="noreferrer"
                className="border-b leading-normal border-primary/50 hover:border-transparent transition-colors"
              >
                <IconExternalLink size={12} className="inline mr-1 -translate-y-[1px]" />
                Learn more about marginfi&apos;s decentralized oracle strategy.
              </Link>
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )}
  </div>
);

export const getRateCell = ({
  rateAPY,
  symbol,
  emissionRate,
  emissionsRemaining,
  lendingRate,
  isInLendingMode,
  bankAddress,
  mintAddress,
}: RateData) => {
  return (
    <div className={cn("flex justify-end items-center gap-2", isInLendingMode ? "text-success" : "text-warning")}>
      {emissionRate > 0 &&
        emissionsRemaining > 0 &&
        EMISSION_MINT_INFO_MAP.get(symbol) !== undefined &&
        isInLendingMode && (
          <div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Image
                    src={EMISSION_MINT_INFO_MAP.get(symbol)!.tokenLogoUri}
                    alt="info"
                    height={18}
                    width={18}
                    className="rounded-full"
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="flex flex-col items-start gap-1.5">
                    <h4 className="text-base flex items-center gap-1.5">
                      <Image
                        src={EMISSION_MINT_INFO_MAP.get(symbol)!.tokenLogoUri}
                        alt="info"
                        height={18}
                        width={18}
                        className="rounded-full"
                      />{" "}
                      Liquidity rewards
                    </h4>
                    <p className="text-xs">
                      {`${percentFormatter.format(aprToApy(lendingRate))} Supply APY + ${percentFormatter.format(
                        aprToApy(emissionRate)
                      )} ${EMISSION_MINT_INFO_MAP.get(symbol)!.tokenSymbol} rewards. `}
                    </p>
                    <p className="text-xs">
                      <Link
                        target="_blank"
                        rel="noreferrer"
                        href="https://docs.marginfi.com"
                        className="inline-block border-b transition-colors hover:border-transparent text-xs"
                      >
                        Learn more.
                      </Link>
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      {symbol === "mSOL" && (
        <div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Image
                  src={`${IMAGE_CDN_URL}/MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey.png`}
                  alt="info"
                  height={15}
                  width={15}
                />
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex flex-col items-start gap-1.5">
                  <h4 className="text-base flex items-center gap-1.5">
                    <Image
                      src={`${IMAGE_CDN_URL}/MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey.png`}
                      alt="info"
                      height={15}
                      width={15}
                    />
                    MNDE rewards
                  </h4>
                  <p className="text-xs">Eligible for Marinade Earn rewards.</p>
                  <Link
                    target="_blank"
                    rel="noreferrer"
                    href="https://marinade.finance/app/earn/"
                    className="inline-block border-b transition-colors hover:border-transparent text-xs"
                  >
                    Learn more
                  </Link>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
      <div className="flex flex-col gap-0.5 items-end">
        {symbol === "SOL" || symbol === "JitoSOL" ? (
          <EmissionsPopover rateAPY={rateAPY} />
        ) : (
          <p>{percentFormatter.format(rateAPY)}</p>
        )}
      </div>
    </div>
  );
};

type EmissionsRateData = {
  day: string;
  jto_usd: number;
  all_user_value: number;
  rate_enhancement: number;
  annualized_rate_enhancement: number;
};

const EmissionsPopover = ({ rateAPY }: { rateAPY: number }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [shouldClose, setShouldClose] = React.useState(false);
  const debouncedShouldClose = useDebounce(shouldClose, 300);
  const [ratesData, setRatesData] = React.useState<EmissionsRateData | null>(null);

  const fetchRatesData = async () => {
    const res = await fetch("/api/emissions/rates");
    const data = await res.json();
    setRatesData(data);
  };

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

  React.useEffect(() => {
    fetchRatesData();
  }, []);

  console.log("ratesData", ratesData);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className="outline-none">
        <p className="text-right">{percentFormatter.format(rateAPY)}</p>
        <div className="flex items-center gap-1 justify-end">
          <p className="text-xs text-blue-400">+4.57%</p>
          <div className="flex items-center -space-x-1.5">
            <Image
              src={`${IMAGE_CDN_URL}/J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn.png`}
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
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent side="top" className="w-80 p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center -space-x-2">
              <Image
                src={`${IMAGE_CDN_URL}/J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn.png`}
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
            </div>
            <h3 className="font-medium">JitoSOL / SOL Pair Incentives</h3>
          </div>

          <div className="flex justify-between items-start">
            <div className="flex items-center gap-1">
              100k{" "}
              <Image
                src={`${IMAGE_CDN_URL}/jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL.png`}
                alt="JTO"
                height={18}
                width={18}
                className="rounded-full"
              />{" "}
              JTO
            </div>
            <p className="text-mrgn-success">~4.31% APY</p>
          </div>

          <div className="border-t border-muted-foreground/20"></div>

          <div className="text-sm space-y-2 text-muted-foreground">
            <p className=" leading-relaxed">
              JTO emissions are distributed weekly to users who are lending JitoSOL and borrowing SOL.
            </p>
            <Link href="https://docs.marginfi.com" target="_blank" rel="noreferrer" className="inline-block">
              Read more <IconExternalLink size={14} className="inline -translate-y-[1px]" />
            </Link>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const getAssetWeightCell = ({
  bank,
  extendedBankInfos,
  assetWeight,
  originalAssetWeight,
  emodeActive,
  isInLendingMode,
  collateralBanks,
  liabilityBanks,
}: AssetWeightData) => {
  return (
    <div className="flex justify-end items-center">
      {(emodeActive && originalAssetWeight) ||
      (collateralBanks && collateralBanks.length > 0) ||
      (liabilityBanks && liabilityBanks.length > 0) ? (
        <EmodePopover
          bank={bank}
          extendedBanks={extendedBankInfos}
          assetWeight={assetWeight}
          originalAssetWeight={originalAssetWeight}
          emodeActive={emodeActive}
          isInLendingMode={isInLendingMode}
          collateralBanks={collateralBanks}
          liabilityBanks={liabilityBanks}
          triggerType="weight"
        />
      ) : (
        <div className="flex justify-end items-center">
          {percentFormatterMod(assetWeight, { minFractionDigits: 0, maxFractionDigits: 2 })}
        </div>
      )}
    </div>
  );
};

export const getDepositsCell = (depositsData: DepositsData) => {
  return (
    <div
      className={cn(
        "flex flex-col items-end text-foreground",
        depositsData.isBankHigh && !depositsData.isReduceOnly && "text-warning",
        depositsData.isBankFilled && !depositsData.isReduceOnly && "text-destructive-foreground"
      )}
    >
      <div className="flex items-center gap-0.5">
        {dynamicNumeralFormatter(depositsData.bankDeposits, {
          forceDecimals: true,
        })}

        {(depositsData.isBankHigh || depositsData.isBankFilled) && !depositsData.isReduceOnly && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <IconAlertTriangle size={14} />
              </TooltipTrigger>
              <TooltipContent>
                {depositsData.isBankHigh && !depositsData.isBankFilled
                  ? "This bank is approaching maximum capacity."
                  : depositsData.isBankFilled
                    ? "This bank is at maximum capacity."
                    : "This bank is at maximum capacity."}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        $
        {dynamicNumeralFormatter(depositsData.bankDepositsUsd, {
          forceDecimals: true,
        })}
      </p>
    </div>
  );
};

export const getBankCapCell = ({ bankCap, bankCapUsd }: BankCapData) => (
  <div className="flex flex-col items-end gap-0.5 text-foreground">
    <p>
      {dynamicNumeralFormatter(bankCap, {
        forceDecimals: true,
      })}
    </p>
    <p className="text-xs text-muted-foreground">
      $
      {dynamicNumeralFormatter(bankCapUsd, {
        forceDecimals: true,
      })}
    </p>
  </div>
);

export const getUtilizationCell = ({ utilization }: UtilizationData) => (
  <div className="flex justify-end">{percentFormatter.format(utilization / 100)}</div>
);

export const getPositionCell = (positionData: PositionData) => {
  const makeTokenAmount = (amount: number, symbol: string) => dynamicNumeralFormatter(amount) + " " + symbol;
  const tokenWalletAmount = makeTokenAmount(positionData.walletAmount, positionData.symbol);
  const tokenPositionAmount = makeTokenAmount(positionData.positionAmount!, positionData.symbol);
  const tokenPrice = positionData.price;

  return (
    <div className="mt-2 w-full bg-background-gray rounded-md flex items-center gap-8 px-2 py-3">
      <dl className="flex gap-2 items-center">
        <dt className="text-accent-foreground font-light">Wallet:</dt>
        <dd>
          <div className="flex items-center gap-2">
            <span className="text-foreground">{tokenWalletAmount}</span>
            <span className="text-muted-foreground">
              ({usdFormatter.format(positionData.walletAmount * tokenPrice)})
            </span>
          </div>
        </dd>
      </dl>
      {positionData.stakedAmount && (
        <dl className="flex gap-2 items-center">
          <dt className="text-accent-foreground font-light">Total staked:</dt>
          <dd>
            <div className="flex items-center gap-2">
              <span className="text-foreground">{makeTokenAmount(positionData.stakedAmount, "SOL")}</span>
              <span className="text-muted-foreground">
                ({usdFormatter.format(positionData.stakedAmount * (positionData.solPrice || 0))})
              </span>
            </div>
          </dd>
        </dl>
      )}
      {positionData.positionAmount && positionData.positionUsd && (
        <dl className="flex gap-2 items-center">
          <dt className="text-accent-foreground font-light">
            {positionData.isInLendingMode ? "Lending:" : "Borrowing:"}
          </dt>
          <dd className="flex gap-1 items-center">{tokenPositionAmount}</dd>
          <span className="text-muted-foreground">
            ($
            {dynamicNumeralFormatter(positionData.positionUsd, {
              forceDecimals: true,
            })}
            )
          </span>
        </dl>
      )}
      {positionData.liquidationPrice && (
        <dl className="flex gap-2 items-center">
          <dt
            className={cn(
              "text-accent-foreground text-xs font-light flex gap-1",
              positionData.isUserPositionPoorHealth && "text-destructive-foreground"
            )}
          >
            {positionData.isUserPositionPoorHealth && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconAlertTriangle size={16} />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Your account is at risk of liquidation</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            Liquidation price:
          </dt>
          <dd className={cn(positionData.isUserPositionPoorHealth && "text-destructive-foreground")}>
            {positionData.liquidationPrice > 0.01
              ? usdFormatter.format(positionData.liquidationPrice)
              : `$${positionData.liquidationPrice.toExponential(2)}`}
          </dd>
        </dl>
      )}
    </div>
  );
};

export const getValidatorCell = (validatorVoteAccount: PublicKey) => {
  if (!validatorVoteAccount) {
    return (
      <div className="flex items-center justify-end gap-2">
        <Skeleton className="h-3 w-16" />
      </div>
    );
  }
  const pkStr = validatorVoteAccount.toBase58();
  return (
    <div className="flex items-center justify-end gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={`https://solscan.io/account/${pkStr}`} target="_blank" rel="noreferrer">
              {shortenAddress(pkStr)}
            </Link>
          </TooltipTrigger>
          <TooltipContent>
            <p>{pkStr}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export const getValidatorRateCell = (rewardRate: number) => {
  if (!rewardRate) {
    return (
      <div className="flex items-center justify-end gap-2">
        <Skeleton className="h-3 w-16" />
      </div>
    );
  }
  return <div className="text-right text-success">{percentFormatter.format(rewardRate / 100)}</div>;
};
