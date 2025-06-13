import React from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import Error from "next/error";

import { ActionBox, useWallet } from "@mrgnlabs/mrgn-ui";
import { LendingModes, getAssetPriceData } from "@mrgnlabs/mrgn-utils";
import { ActionType, Emissions } from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginRequirementType, AssetTag } from "@mrgnlabs/marginfi-client-v2";
import {
  aprToApy,
  usdFormatter,
  numeralFormatter,
  percentFormatter,
  dynamicNumeralFormatter,
  shortenAddress,
} from "@mrgnlabs/mrgn-common";

import { useMrgnlendStore, useUiStore } from "~/store";

import { BankChart, BankShare } from "~/components/common/bank/components";
import { Loader } from "~/components/ui/loader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { IconSwitchboard, IconPyth } from "~/components/ui/icons";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { Button } from "~/components/ui/button";

export default function BankPage() {
  const router = useRouter();
  const { address } = React.useMemo(() => router.query, [router]);

  const [initialized, fetchMrgnlendState, extendedBankInfos] = useMrgnlendStore((state) => [
    state.initialized,
    state.fetchMrgnlendState,
    state.extendedBankInfos,
  ]);
  const [lendingMode] = useUiStore((state) => [state.lendingMode]);
  const { connected, walletContextState } = useWallet();

  const bank = extendedBankInfos.find((bank) => bank.address.toBase58() === address);

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
      totalBorrows: Math.min(
        bank.info.state.availableLiquidity,
        bank.info.state.borrowCap - bank.info.state.totalBorrows
      ),
      totalBorrowsUsd:
        Math.min(bank.info.state.availableLiquidity, bank.info.state.borrowCap - bank.info.state.totalBorrows) *
        bank.info.oraclePrice.priceRealtime.price.toNumber(),
      utilization: bank.info.state.utilizationRate / 100,
      weight: assetWeightInit <= 0 ? 0 : assetWeightInit,
      ltv: 1 / bank.info.rawBank.config.liabilityWeightInit.toNumber(),
      lendingRate:
        bank.info.rawBank.config.assetTag === AssetTag.STAKED
          ? bank.meta.stakePool?.validatorRewards
          : aprToApy(lendingRate) * 100,
      borrowingRate: bank.info.rawBank.config.assetTag === AssetTag.STAKED ? 0 : aprToApy(borrowingRate) * 100,
    };
  }, [bank]);

  const stats = React.useMemo(
    () => [
      {
        title: "Total Deposits",
        description: "Total deposits in the bank",
        value: (
          <div className="flex flex-col lg:flex-row items-center justify-center">
            <span>{dynamicNumeralFormatter(bankData?.totalDeposits || 0)}</span>
            <span className="text-muted-foreground lg:ml-2 text-base">
              (${dynamicNumeralFormatter(bankData?.totalDepositsUsd || 0)})
            </span>
          </div>
        ),
      },
      {
        title: "Total Borrows",
        description: "Total borrows in the bank",
        value: (
          <div className="flex flex-col lg:flex-row items-center justify-center">
            <span>{dynamicNumeralFormatter(bankData?.totalBorrows || 0)}</span>
            <span className="text-muted-foreground lg:ml-2 text-base">
              (${dynamicNumeralFormatter(bankData?.totalBorrowsUsd || 0)})
            </span>
          </div>
        ),
      },
      {
        title: "Utilization",
        description: "Utilization of the bank",
        value: `${percentFormatter.format(bankData?.utilization || 0)}`,
      },
      {
        title: "Collateral Weight",
        description: "Weight of the bank",
        value: bankData?.weight ? `${percentFormatter.format(bankData.weight)}` : 0,
      },
      {
        title: "Loan-to-Value",
        description: "Loan-to-Value of the bank",
        value: bankData?.ltv ? `${percentFormatter.format(bankData.ltv)}` : 0,
      },
      {
        title: "Interest Rates (APY)",
        description: "Interest rates of the bank",
        value: (
          <div className="flex items-center justify-center gap-2 text-2xl">
            <span className="text-mrgn-success">{numeralFormatter(bankData?.lendingRate || 0)}%</span>/
            <span className="text-mrgn-warning">{numeralFormatter(bankData?.borrowingRate || 0)}%</span>
          </div>
        ),
      },
    ],
    [bankData]
  );

  if (!initialized) {
    return <Loader label="Loading bank..." />;
  }

  if (!address) {
    return <Error statusCode={400} />;
  }

  if (!bank) {
    return <Error statusCode={404} />;
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
          <div className="flex items-center gap-6">
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
            <BankShare bank={bank} />
          </div>
          <ul className="flex flex-col gap-2 items-center text-muted-foreground mt-6">
            <li className="flex items-center gap-1">
              <span>Price:</span>{" "}
              <span className="text-foreground">
                ${dynamicNumeralFormatter(bank.info.oraclePrice.priceRealtime.price.toNumber())}
              </span>
              {assetPriceData && assetPriceData.oracle === "Pyth" ? (
                <IconPyth size={14} className="inline ml-1" />
              ) : assetPriceData && assetPriceData.oracle === "Switchboard" ? (
                <IconSwitchboard size={14} className="inline ml-1" />
              ) : null}
            </li>
            <li>
              <span>Bank:</span>{" "}
              <Link
                href={`https://solscan.io/account/${bank.address.toBase58()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground"
              >
                {shortenAddress(bank.address.toBase58())}
              </Link>
            </li>
            <li>
              <span>Mint:</span>{" "}
              <Link
                href={`https://solscan.io/token/${bank.info.rawBank.mint.toBase58()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground"
              >
                {shortenAddress(bank.info.rawBank.mint.toBase58())}
              </Link>
            </li>
          </ul>
        </div>
        {stats.length > 0 && (
          <div className="w-full grid grid-cols-2 gap-4 md:gap-8 md:grid-cols-3">
            {stats.map((stat) => (
              <Stat key={stat.title} title={stat.title} description={stat.description} value={stat.value} />
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
              onComplete: () => {
                fetchMrgnlendState();
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
  value?: string | number | React.ReactNode;
};

const Stat = ({ title, description, value }: StatProps) => {
  return (
    <Card className="w-full bg-background-gray rounded-md">
      <CardHeader className="items-center text-muted-foreground">
        <CardTitle className="font-normal">{title}</CardTitle>
        <CardDescription className="sr-only">{description}</CardDescription>
      </CardHeader>
      <CardContent>{value && <div className="text-2xl lg:text-3xl text-center">{value}</div>}</CardContent>
    </Card>
  );
};
