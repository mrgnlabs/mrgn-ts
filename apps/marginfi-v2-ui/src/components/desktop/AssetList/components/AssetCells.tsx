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
import { IconAlertTriangle, IconExternalLink, IconInfoCircle } from "@tabler/icons-react";

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

export const getAssetCell = (asset: AssetData) => {
  return (
    <div className="flex gap-2 justify-start items-center">
      <div className="flex items-center gap-4">
        <Image src={asset.image} alt={`${asset.symbol} logo`} height={25} width={25} className="rounded-full" />
        <div>{asset.symbol}</div>
        {/* {asset.hasEmode && asset.emodeTag && (
          <EmodePopover
            assetWeight={asset.assetWeight}
            originalAssetWeight={asset.originalAssetWeight}
            emodeActive={asset.emodeActive}
            emodeTag={asset.emodeTag}
            isInLendingMode={asset.isInLendingMode}
            collateralBanks={asset.collateralBanks}
            liabilityBanks={asset.liabilityBanks}
            triggerType="tag"
          />
        )} */}
      </div>
    </div>
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
                  height={18}
                  width={18}
                />
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex flex-col items-start gap-1.5">
                  <h4 className="text-base flex items-center gap-1.5">
                    <Image
                      src={`${IMAGE_CDN_URL}/MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey.png`}
                      alt="info"
                      height={18}
                      width={18}
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

      <div className="flex justify-end">{percentFormatter.format(rateAPY)}</div>
    </div>
  );
};

export const getAssetWeightCell = ({
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
        "flex flex-col items-end gap-0.5 text-foreground",
        (depositsData.isReduceOnly || depositsData.isBankHigh) && "text-warning",
        depositsData.isBankFilled && "text-destructive-foreground"
      )}
    >
      <div className="flex items-center gap-1">
        {dynamicNumeralFormatter(depositsData.bankDeposits, {
          forceDecimals: true,
        })}

        {(depositsData.isReduceOnly || depositsData.isBankHigh || depositsData.isBankFilled) && (
          <IconAlertTriangle size={14} />
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

// export const getDepositsCell = (depositsData: DepositsData) => {
//   return (
//     <TooltipProvider>
//       <Tooltip>
//         <TooltipTrigger asChild>
//           <span
//             className={cn(
//               "flex items-center justify-end gap-1.5 text-white",
//               (depositsData.isReduceOnly || depositsData.isBankHigh) && "text-warning",
//               depositsData.isBankFilled && "text-destructive-foreground"
//             )}
//           >
//             {depositsData.denominationUSD && "$"}
//             {dynamicNumeralFormatter(depositsData.bankDeposits, {
//               forceDecimals: true,
//             })}

//             {(depositsData.isReduceOnly || depositsData.isBankHigh || depositsData.isBankFilled) && (
//               <IconAlertTriangle size={14} />
//             )}
//           </span>
//         </TooltipTrigger>
//         <TooltipContent className="text-left">
//           {depositsData.isStakedAsset && !depositsData.isInLendingMode ? (
//             <div>
//               <span>Native stake can only be deposited at this time.</span>
//             </div>
//           ) : (
//             <>
//               <div>
//                 {depositsData.isReduceOnly
//                   ? "Reduce Only"
//                   : depositsData.isBankHigh && (depositsData.isBankFilled ? "Limit Reached" : "Approaching Limit")}
//               </div>

//               {depositsData.isReduceOnly ? (
//                 <span>{depositsData.symbol} is being discontinued.</span>
//               ) : (
//                 <>
//                   <span>
//                     {depositsData.symbol} {depositsData.isInLendingMode ? "deposits" : "borrows"} are at{" "}
//                     {percentFormatterMod(depositsData.capacity, {
//                       minFractionDigits: 0,
//                       maxFractionDigits:
//                         depositsData.isBankHigh && !depositsData.isBankFilled && depositsData.capacity >= 0.99 ? 4 : 2,
//                     })}{" "}
//                     capacity.
//                   </span>
//                   {!depositsData.isBankFilled && (
//                     <>
//                       <br />
//                       <br />
//                       <span>Available: {numeralFormatter(depositsData.available)}</span>
//                     </>
//                   )}
//                 </>
//               )}
//               <br />
//               <br />
//               <a href="https://docs.marginfi.com">
//                 <u>Learn more.</u>
//               </a>
//             </>
//           )}
//         </TooltipContent>
//       </Tooltip>
//     </TooltipProvider>
//   );
// };

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
  const tokenPrice = positionData.assetTag === 2 ? positionData.solPrice || positionData.price : positionData.price;

  return (
    <div className="w-full bg-background-gray rounded-md flex items-center gap-8 px-2 py-3">
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
  if (!validatorVoteAccount) return null;
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
  return <div className="text-right text-success">{rewardRate ? percentFormatter.format(rewardRate / 100) : 0}</div>;
};
