import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Image from "next/image";
import { PublicKey } from "@solana/web3.js";

import { IconArrowLeft, IconCheck, IconLink, IconInfoCircle, IconLoader2 } from "@tabler/icons-react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { ActionBox, useWallet, AddressActions } from "@mrgnlabs/mrgn-ui";
import { Skeleton } from "~/components/ui/skeleton";
import { LendingModes, getAssetPriceData, getAssetWeightData, cn } from "@mrgnlabs/mrgn-utils";
import { ActionType, Emissions, useNativeStakeData, useValidatorRates } from "@mrgnlabs/mrgn-state";
import { MarginRequirementType, AssetTag, OperationalState } from "@mrgnlabs/marginfi-client-v2";
import {
  aprToApy,
  numeralFormatter,
  percentFormatter,
  percentFormatterMod,
  dynamicNumeralFormatter,
} from "@mrgnlabs/mrgn-common";

import { useUiStore } from "~/store";

import { BankChart, BankShare } from "~/components/common/bank/components";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { IconSwitchboard, IconPyth, IconEmodeSimple, IconEmodeSimpleInactive } from "~/components/ui/icons";
import { Button } from "~/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { EmodePopover } from "~/components/common/emode/components/emode-popover";
import {
  groupCollateralBanksByLiabilityBank,
  groupLiabilityBanksByCollateralBank,
  useEmode,
  useExtendedBanks,
  useRefreshUserData,
} from "@mrgnlabs/mrgn-state";
import { Loader } from "~/components/ui/loader";

export default function BankPage() {
  const router = useRouter();
  const { connected, walletContextState, walletAddress } = useWallet();
  const [isAddressCopied, setIsAddressCopied] = React.useState(false);

  const { address } = React.useMemo(() => router.query, [router]);

  React.useEffect(() => {
    document.body.scrollTo(0, 0);
  }, [address]);

  const { extendedBanks } = useExtendedBanks();
  const { emodePairs, activeEmodePairs } = useEmode();
  const { stakePoolMetadataMap } = useNativeStakeData();

  const collateralBanksByLiabilityBank = React.useMemo(() => {
    if (!extendedBanks.length || !emodePairs.length) return {};

    return groupCollateralBanksByLiabilityBank(extendedBanks, emodePairs);
  }, [extendedBanks, emodePairs]);

  const liabilityBanksByCollateralBank = React.useMemo(() => {
    if (!extendedBanks.length || !emodePairs.length) return {};

    return groupLiabilityBanksByCollateralBank(extendedBanks, emodePairs);
  }, [extendedBanks, emodePairs]);

  const refreshUserData = useRefreshUserData();

  const [lendingMode] = useUiStore((state) => [state.lendingMode]);

  const bank = extendedBanks.find((bank) => bank.address.toBase58() === address);

  const stakePoolMetadata = bank?.address ? stakePoolMetadataMap.get(bank.address.toBase58()) : undefined;

  const reduceOnly = bank?.info.rawBank.config.operationalState === OperationalState.ReduceOnly;
  const isIsolatedBank = bank?.info.rawBank.config.assetTag !== 2 && bank?.info.state.isIsolated;
  const isNativeStakeBank = bank?.info.rawBank.config.assetTag === 2;

  const assetPriceData = React.useMemo(() => {
    if (!bank) {
      return null;
    }

    return getAssetPriceData(bank);
  }, [bank]);

  const bankData = React.useMemo(() => {
    if (!bank) {
      return null;
    }

    const assetWeightInit = bank.info.rawBank
      .getAssetWeight(MarginRequirementType.Initial, bank.info.oraclePrice)
      .toNumber();

    let lendingRate = bank.info.state.lendingRate;
    let borrowingRate = bank.info.state.borrowingRate;

    if (bank.info.state.emissions == Emissions.Lending) {
      lendingRate += bank.info.state.emissionsRate;
    }

    if (bank.info.state.emissions == Emissions.Borrowing) {
      borrowingRate += bank.info.state.emissionsRate;
    }

    return {
      totalDeposits: bank.info.state.totalDeposits,
      totalDepositsUsd: bank.info.state.totalDeposits * bank.info.oraclePrice.priceRealtime.price.toNumber(),
      totalBorrows: bank.info.state.totalBorrows,
      totalBorrowsUsd: bank.info.state.totalBorrows * bank.info.oraclePrice.priceRealtime.price.toNumber(),
      utilization: bank.info.state.utilizationRate / 100,
      weight: assetWeightInit <= 0 ? 0 : assetWeightInit,
      ltv: 1 / bank.info.rawBank.config.liabilityWeightInit.toNumber(),
      lendingRate:
        bank.info.rawBank.config.assetTag === AssetTag.STAKED
          ? 0 //bank.meta.stakePool?.validatorRewards TODO migrate this
          : aprToApy(lendingRate) * 100,
      borrowingRate: bank.info.rawBank.config.assetTag === AssetTag.STAKED ? 0 : aprToApy(borrowingRate) * 100,
    };
  }, [bank]);

  const assetWeightData = React.useMemo(() => {
    if (!bank) {
      return null;
    }
    const collateralBanks = collateralBanksByLiabilityBank?.[bank.address.toBase58()] || [];
    const liabilityBanks = liabilityBanksByCollateralBank?.[bank.address.toBase58()] || [];

    return getAssetWeightData(bank, true, extendedBanks, undefined, collateralBanks, liabilityBanks, activeEmodePairs);
  }, [bank, extendedBanks, collateralBanksByLiabilityBank, liabilityBanksByCollateralBank, activeEmodePairs]);

  const stats = React.useMemo(
    () => [
      {
        title: "Total Deposits",
        description: "Total deposits in the bank",
        tooltip: "Total deposits in the pool.",
        value: (
          <div className="flex flex-col lg:flex-row items-center justify-center">
            <span>
              {dynamicNumeralFormatter(
                bankData?.totalDeposits && bankData?.totalDeposits >= 0 ? bankData?.totalDeposits : 0
              )}
            </span>
            <span className="text-muted-foreground lg:ml-2 text-base">
              ($
              {dynamicNumeralFormatter(
                bankData?.totalDepositsUsd && bankData?.totalDepositsUsd >= 0 ? bankData?.totalDepositsUsd : 0
              )}
              )
            </span>
          </div>
        ),
      },
      {
        title: "Total Borrows",
        description: "Total borrows in the bank",
        tooltip: "Total borrows in the pool.",
        value: isNativeStakeBank ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-muted-foreground">—</span>
                  <IconInfoCircle size={14} className="cursor-help" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>
                  You cannot take out native stake borrows. Deposit your native stake to increase your borrow capacity.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <div className="flex flex-col lg:flex-row items-center justify-center">
            <span>
              {dynamicNumeralFormatter(
                bankData?.totalBorrows && bankData?.totalBorrows >= 0 ? bankData?.totalBorrows : 0
              )}
            </span>
            <span className="text-muted-foreground lg:ml-2 text-base">
              ($
              {dynamicNumeralFormatter(
                bankData?.totalBorrowsUsd && bankData?.totalBorrowsUsd >= 0 ? bankData?.totalBorrowsUsd : 0
              )}
              )
            </span>
          </div>
        ),
      },
      {
        title: "Utilization",
        description: "Utilization of the bank",
        tooltip: "The percentage of supplied tokens that have been borrowed.",
        value: `${percentFormatter.format(bankData?.utilization || 0)}`,
      },
      {
        title: "Collateral Weight",
        description: "Weight of the bank",
        tooltip:
          "Percentage of an asset's value that counts toward your collateral. Higher weight means more borrowing power for that asset.",
        value:
          assetWeightData && bank ? (
            isIsolatedBank ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-muted-foreground">—</span>
                      <IconInfoCircle size={14} className="cursor-help" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>
                      An isolated bank cannot be borrowed against. Use isolated banks to increase your borrow capacity.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <div className="flex items-center justify-center">
                {(assetWeightData.emodeActive && assetWeightData.originalAssetWeight) ||
                (assetWeightData.collateralBanks && assetWeightData.collateralBanks.length > 0) ||
                (assetWeightData.liabilityBanks && assetWeightData.liabilityBanks.length > 0) ? (
                  <EmodePopover
                    bank={bank}
                    extendedBanks={extendedBanks}
                    assetWeight={assetWeightData.assetWeight}
                    originalAssetWeight={assetWeightData.originalAssetWeight}
                    emodeActive={assetWeightData.emodeActive}
                    isInLendingMode={true}
                    collateralBanks={assetWeightData.collateralBanks}
                    liabilityBanks={assetWeightData.liabilityBanks}
                    triggerType="weight"
                    iconSize="lg"
                  />
                ) : (
                  <div className="flex justify-end items-center">
                    {percentFormatterMod(assetWeightData.assetWeight, {
                      minFractionDigits: 0,
                      maxFractionDigits: 2,
                    })}
                  </div>
                )}
              </div>
            )
          ) : (
            0
          ),
      },
      {
        title: "Loan-to-Value",
        description: "Loan-to-Value of the bank",
        tooltip:
          "Loan-to-Value ratio (LTV) shows how much you can borrow relative to your available collateral. A higher LTV means you can borrow more, but it also increases liquidation risk.",
        value: bankData?.ltv ? `${percentFormatter.format(bankData.ltv)}` : 0,
      },
      {
        title: "Interest Rates (APY)",
        description: "Interest rates of the bank",
        tooltip: isNativeStakeBank
          ? "Green shows what you'll earn on deposits over a year. Compounding included."
          : "Green shows what you'll earn on deposits over a year. Yellow shows what you'll pay for borrows over a year. Both include compounding.",
        value: (
          <div className={`flex items-center justify-center gap-2 ${!isNativeStakeBank ? "text-2xl" : ""}`}>
            <span className="text-mrgn-success">
              {numeralFormatter(
                isNativeStakeBank ? stakePoolMetadata?.validatorRewards || 0 : bankData?.lendingRate || 0
              )}
              %
            </span>
            {!isNativeStakeBank && (
              <>
                /<span className="text-mrgn-warning">{numeralFormatter(bankData?.borrowingRate || 0)}%</span>
              </>
            )}
          </div>
        ),
      },
    ],
    [bankData, isNativeStakeBank, assetWeightData, bank, isIsolatedBank, extendedBanks]
  );

  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (extendedBanks && extendedBanks.length > 0) {
      setIsLoading(false);
    }
  }, [extendedBanks]);

  if (!address || !bank) {
    return <Loader label="Loading bank" />;
  }

  if (isLoading) {
    return (
      <div className="w-full space-y-4 max-w-8xl mx-auto pb-24 px-4 md:pb-16 md:-translate-y-4 md:space-y-6">
        <div>
          <Button variant="outline" disabled>
            <IconArrowLeft size={14} />
            Back to banks
          </Button>
        </div>

        <header className="flex flex-col lg:flex-row items-center justify-between gap-8 pb-4 pt-4 md:pt-0">
          <div className="flex flex-col items-center lg:w-1/2">
            <div className="flex items-center gap-4">
              <h1 className="flex items-center gap-3 text-4xl font-medium">
                <Skeleton className="h-12 w-12 rounded-full" />
                <Skeleton className="h-8 w-24" />
              </h1>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="icon" disabled>
                  <IconLink size={16} />
                </Button>
                <Button variant="secondary" size="icon" disabled>
                  <IconLink size={16} />
                </Button>
              </div>
            </div>

            <ul className="flex flex-col gap-2 items-start text-foreground mt-6 translate-x-8">
              <li className="flex items-center gap-1">
                <span className="text-muted-foreground w-10">Price:</span>
                <Skeleton className="h-4 w-16" />
              </li>
              <li className="flex items-center justify-center gap-1">
                <span className="text-muted-foreground w-10">Bank:</span>
                <Skeleton className="h-4 w-32" />
              </li>
              <li className="flex items-center justify-center gap-1">
                <span className="text-muted-foreground w-10">Mint:</span>
                <Skeleton className="h-4 w-32" />
              </li>
            </ul>
          </div>

          <div className="w-full grid grid-cols-2 gap-4 md:gap-8 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="w-full bg-background-gray rounded-md h-32">
                <CardHeader className="items-center text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CardTitle className="font-normal">
                      <Skeleton className="h-4 w-24" />
                    </CardTitle>
                  </div>
                  <CardDescription className="sr-only">Loading...</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl lg:text-3xl text-center">
                    <Skeleton className="h-8 w-20 mx-auto" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </header>

        <div className="w-full grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8">
            <Card className="w-full bg-background-gray h-[520px] flex flex-col items-center justify-center">
              <CardContent className="flex flex-col items-center justify-center w-full h-full gap-2">
                <IconLoader2 size={16} className="animate-spin" />
                <p className="text-muted-foreground">Loading chart...</p>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-4 py-8 lg:pb-0 lg:pt-0">
            <Card className="w-full bg-background-gray h-[200px] md:h-full flex flex-col items-center justify-center">
              <CardContent className="flex flex-col items-center justify-center w-full h-full gap-2">
                <IconLoader2 size={16} className="animate-spin" />
                <p className="text-muted-foreground">Loading data...</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 max-w-8xl mx-auto pb-24 px-4 md:pb-16 md:-translate-y-4 md:space-y-6">
      <Link href="/">
        <Button variant="outline">
          <IconArrowLeft size={14} />
          Back to banks
        </Button>
      </Link>
      <header className="flex flex-col lg:flex-row items-center justify-between gap-8 pb-4 pt-4 md:pt-0 ">
        <div className="flex flex-col items-center lg:w-1/2">
          {reduceOnly && (
            <div className="flex items-center gap-2 mb-4 bg-destructive text-destructive-foreground border border-destructive-foreground/20 rounded-md px-2 py-1">
              <IconInfoCircle size={14} className="cursor-help" />
              <p>This bank is in reduce-only mode.</p>
            </div>
          )}
          <div className="flex items-center gap-4">
            <h1 className="flex items-center gap-3 text-4xl font-medium">
              <Image
                src={bank.meta.tokenLogoUri}
                alt={bank.meta.tokenSymbol}
                width={48}
                height={48}
                className="rounded-full"
              />
              {bank.meta.tokenSymbol}
            </h1>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <CopyToClipboard
                        text={bank.address.toBase58()}
                        onCopy={() => {
                          setIsAddressCopied(true);
                          setTimeout(() => {
                            setIsAddressCopied(false);
                          }, 2000);
                        }}
                      >
                        <Button variant="secondary" size="icon">
                          {isAddressCopied ? <IconCheck size={16} /> : <IconLink size={16} />}
                        </Button>
                      </CopyToClipboard>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copy bank link</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <BankShare bank={bank} />
            </div>
          </div>
          <ul className="flex flex-col gap-2 items-start text-foreground mt-6 translate-x-8">
            <li className="flex items-center gap-1">
              <span className="text-muted-foreground w-10">Price:</span>{" "}
              <span className="text-foreground">
                ${dynamicNumeralFormatter(bank.info.oraclePrice.priceRealtime.price.toNumber())}
              </span>
              {assetPriceData && assetPriceData.oracle === "Pyth" ? (
                <IconPyth size={14} className="inline ml-1" />
              ) : assetPriceData && assetPriceData.oracle === "Switchboard" ? (
                <IconSwitchboard size={14} className="inline ml-1" />
              ) : null}
            </li>
            <li className="flex items-center justify-center gap-1">
              <span className="text-muted-foreground w-10">Bank:</span> <AddressActions address={bank.address} />
            </li>
            <li className="flex items-center justify-center gap-1">
              <span className="text-muted-foreground w-10">Mint:</span>{" "}
              <AddressActions address={bank.info.rawBank.mint} />
            </li>
          </ul>
        </div>
        {stats.length > 0 && (
          <div className="w-full grid grid-cols-2 gap-4 md:gap-8 md:grid-cols-3">
            {stats.map((stat) => (
              <Stat
                key={stat.title}
                title={stat.title}
                description={stat.description}
                tooltip={stat.tooltip}
                value={stat.value}
              />
            ))}
          </div>
        )}
      </header>
      <div className="w-full grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
          <BankChart bankAddress={bank.address.toBase58()} />
        </div>
        <div className="lg:col-span-4 py-8 lg:pb-0 lg:pt-0 bg-background-gray rounded-md">
          <ActionBox.BorrowLend
            useProvider={true}
            lendProps={{
              requestedLendType: lendingMode === LendingModes.LEND ? ActionType.Deposit : ActionType.Borrow,
              connected,
              walletContextState,
              requestedBank: bank,
              showTokenSelection: false,
              captureEvent: (event, properties) => {
                // capture(event, properties);
              },
              onComplete: (newAccountKey?: PublicKey) => {
                refreshUserData({ newAccountKey });
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}

type StatProps = {
  title: string;
  description: string;
  tooltip: string;
  value?: string | number | React.ReactNode;
};

const Stat = ({ title, description, tooltip, value }: StatProps) => {
  return (
    <Card className="w-full bg-background-gray rounded-md h-full md:h-32">
      <CardHeader className="items-center text-muted-foreground">
        <div className="flex items-center gap-1">
          <CardTitle className="font-normal text-center">{title}</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <IconInfoCircle size={14} className="cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <CardDescription className="sr-only">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {value !== undefined && <div className="text-2xl lg:text-3xl text-center">{value}</div>}
      </CardContent>
    </Card>
  );
};
