import React, { useEffect, useMemo, useState } from "react";
import { View, Text } from "react-native";
import { ZERO } from "@jup-ag/math";
import { RouteInfo, SwapMode, TransactionFeeInfo } from "@jup-ag/react-hook";
import { TokenInfo } from "@solana/spl-token-registry";
import Decimal from "decimal.js";
import JSBI from "jsbi";

import tw from "~/styles/tailwind";
import { formatNumber } from "~/utils";
import { useSwapContext } from "~/context";

import { ExchangeRate } from "./ExchangeRate";
import { Fees } from "./Fees";
import { TransactionFee } from "./TransactionFee";
import { Deposits } from "./Deposits";

export const PriceInfo = ({
  routes,
  selectedSwapRoute,
  fromTokenInfo,
  toTokenInfo,
  loading,
  showFullDetails = false,
  containerClassName,
}: {
  routes: RouteInfo[];
  selectedSwapRoute: RouteInfo;
  fromTokenInfo: TokenInfo;
  toTokenInfo: TokenInfo;
  loading: boolean;
  showFullDetails?: boolean;
  containerClassName?: string;
}) => {
  const rateParams = {
    inAmount: selectedSwapRoute?.inAmount || routes?.[0]?.inAmount || ZERO, // If there's no selectedRoute, we will use first route value to temporarily calculate
    inputDecimal: fromTokenInfo.decimals,
    outAmount: selectedSwapRoute?.outAmount || routes?.[0]?.outAmount || ZERO, // If there's no selectedRoute, we will use first route value to temporarily calculate
    outputDecimal: toTokenInfo.decimals,
  };

  //   const { wallet } = useWalletPassThrough();
  //   const walletPublicKey = useMemo(
  //     () => wallet?.adapter.publicKey?.toString(),
  //     [wallet?.adapter.publicKey],
  //   );

  const priceImpact = formatNumber.format(
    new Decimal(selectedSwapRoute?.priceImpactPct || 0).mul(100).toDP(4).toNumber()
  );
  const priceImpactText = Number(priceImpact) < 0.1 ? `< ${formatNumber.format(0.1)}%` : `~ ${priceImpact}%`;

  const otherAmountThresholdText = useMemo(() => {
    if (selectedSwapRoute?.otherAmountThreshold) {
      const amount = new Decimal(selectedSwapRoute.otherAmountThreshold.toString()).div(
        Math.pow(10, toTokenInfo.decimals)
      );

      const amountText = formatNumber.format(amount.toNumber());
      return `${amountText} ${toTokenInfo.symbol}`;
    }
    return "-";
  }, [selectedSwapRoute]);

  const [feeInformation, setFeeInformation] = useState<TransactionFeeInfo>();

  useEffect(() => {
    setFeeInformation(undefined);
    if (selectedSwapRoute.fees) {
      setFeeInformation(selectedSwapRoute.fees);
    }
  }, [selectedSwapRoute]);

  const hasAtaDeposit = (feeInformation?.ataDeposits.length ?? 0) > 0;
  const hasSerumDeposit = (feeInformation?.openOrdersDeposits.length ?? 0) > 0;

  const {
    jupiter: { priorityFeeInSOL },
  } = useSwapContext();

  return (
    <View style={tw`mt-4 space-y-4 border border-white/5 rounded-xl p-3`}>
      <View style={tw`flex flex-row items-center justify-between`}>
        <Text style={tw`text-secondary text-xs`}>Rate</Text>
        {JSBI.greaterThan(rateParams.inAmount, ZERO) && JSBI.greaterThan(rateParams.outAmount, ZERO) ? (
          <ExchangeRate
            loading={loading}
            rateParams={rateParams}
            fromTokenInfo={fromTokenInfo}
            toTokenInfo={toTokenInfo}
            reversible={true}
          />
        ) : (
          <span className="text-white/30">{"-"}</span>
        )}
      </View>

      <View style={tw`flex flex-row items-center justify-between`}>
        <Text style={tw`text-secondary text-xs`}>Price Impact</Text>
        <Text style={tw`text-secondary text-xs`}>{priceImpactText}</Text>
      </View>

      <View style={tw`flex flex-row items-center justify-between`}>
        <Text style={tw`text-secondary text-xs`}>
          {selectedSwapRoute?.swapMode === SwapMode.ExactIn ? "Minimum Received" : "Maximum Consumed"}
        </Text>
        <Text style={tw`text-secondary text-xs`}>{otherAmountThresholdText}</Text>
      </View>
      {showFullDetails ? (
        <>
          <Fees marketInfos={selectedSwapRoute?.marketInfos} />
          <TransactionFee feeInformation={feeInformation} />
          <Deposits hasSerumDeposit={hasSerumDeposit} hasAtaDeposit={hasAtaDeposit} feeInformation={feeInformation} />

          {priorityFeeInSOL > 0 ? (
            <View style={tw`flex flex-row items-center justify-between text-xs`}>
              <Text style={tw`text-secondary`}>Priority Fee</Text>
              <Text style={tw`text-secondary`}>{new Decimal(priorityFeeInSOL).toString()}</Text>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
};
