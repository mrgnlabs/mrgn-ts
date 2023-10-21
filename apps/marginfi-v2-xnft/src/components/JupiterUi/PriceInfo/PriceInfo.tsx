import React, { useEffect, useMemo, useState } from "react";
import { View, Text } from "react-native";
import { ZERO } from "@jup-ag/math";
import { QuoteResponse, SwapMode, TransactionFeeInfo, calculateFeeForSwap } from "@jup-ag/react-hook";
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
import { useJupiterStore } from "~/store/store";
import { useWallet } from "~/context/WalletContext";

export const PriceInfo = ({
  quoteResponse,
  fromTokenInfo,
  toTokenInfo,
  loading,
  showFullDetails = false,
}: {
  quoteResponse: QuoteResponse;
  fromTokenInfo: TokenInfo;
  toTokenInfo: TokenInfo;
  loading: boolean;
  showFullDetails?: boolean;
}) => {
  const rateParams = {
    inAmount: quoteResponse?.inAmount || ZERO, // If there's no selectedRoute, we will use first route value to temporarily calculate
    inputDecimal: fromTokenInfo.decimals,
    outAmount: quoteResponse?.outAmount || ZERO, // If there's no selectedRoute, we will use first route value to temporarily calculate
    outputDecimal: toTokenInfo.decimals,
  };

  const { publicKey } = useWallet();

  const [tokenAccountMap] = useJupiterStore((state) => [state.tokenAccountMap]);

  //   const { wallet } = useWalletPassThrough();
  //   const walletPublicKey = useMemo(
  //     () => wallet?.adapter.publicKey?.toString(),
  //     [wallet?.adapter.publicKey],
  //   );

  const priceImpact = formatNumber.format(new Decimal(quoteResponse?.priceImpactPct || 0).mul(100).toDP(4).toNumber());
  const priceImpactText = Number(priceImpact) < 0.1 ? `< ${formatNumber.format(0.1)}%` : `~ ${priceImpact}%`;

  const otherAmountThresholdText = useMemo(() => {
    if (quoteResponse?.otherAmountThreshold) {
      const amount = new Decimal(quoteResponse.otherAmountThreshold.toString()).div(Math.pow(10, toTokenInfo.decimals));

      const amountText = formatNumber.format(amount.toNumber());
      return `${amountText} ${toTokenInfo.symbol}`;
    }
    return "-";
  }, [quoteResponse]);

  const [feeInformation, setFeeInformation] = useState<TransactionFeeInfo>();

  const mintToAccountMap = useMemo(() => {
    return new Map(Object.entries(tokenAccountMap).map((acc) => [acc[0], acc[1].pubkey.toString()]));
  }, [tokenAccountMap]);

  useEffect(() => {
    if (quoteResponse) {
      const fee = calculateFeeForSwap(
        quoteResponse,
        mintToAccountMap,
        new Map(), // we can ignore this as we are using shared accounts
        true,
        true
      );
      setFeeInformation(fee);
    } else {
      setFeeInformation(undefined);
    }
  }, [quoteResponse, publicKey, mintToAccountMap]);

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
          {quoteResponse?.swapMode === SwapMode.ExactIn ? "Minimum Received" : "Maximum Consumed"}
        </Text>
        <Text style={tw`text-secondary text-xs`}>{otherAmountThresholdText}</Text>
      </View>
      {showFullDetails ? (
        <>
          <Fees routePlan={quoteResponse?.routePlan} swapMode={quoteResponse.swapMode as SwapMode} />
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
