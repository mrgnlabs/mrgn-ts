import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useSwapContext } from "~/context";
import tw from "~/styles/tailwind";
import * as icons from "~/assets/icons";
import { fromLamports } from "~/utils";
import { getTokenBalanceChangesFromTransactionResponse } from "@jup-ag/common";
import { PublicKey } from "@solana/web3.js";
import { useConnection } from "~/context/ConnectionContext";
import { useWallet } from "~/context/WalletContext";
import { getAssociatedTokenAddressSync } from "@mrgnlabs/mrgn-common";
import { useJupiterStore } from "~/store/store";
import { PriceInfo } from "../PriceInfo";
import { SwapResult } from "@jup-ag/react-hook";

export const ConfirmOrderModal = ({ onClose }: { onClose: () => void }) => {
  const {
    fromTokenInfo,
    lastSwapResult,
    toTokenInfo,
    quoteReponseMeta,
    jupiter: { refresh: refreshJupiter },
    swapping: { txStatus },
  } = useSwapContext();

  const [fetchJupiterState] = useJupiterStore((state) => [state.fetchJupiterState]);

  const { publicKey } = useWallet();

  const [errorMessage, setErrorMessage] = useState("");
  const [lastSwapResultFix, setLastSwapResultFix] = useState<SwapResult>();
  const [isChecked, setIsChecked] = useState<boolean>(false);
  const { connection } = useConnection();

  useEffect(() => {
    if (lastSwapResult && "error" in lastSwapResult) {
      if (lastSwapResult?.error?.txid) {
        waitForTx(lastSwapResult.error.txid, lastSwapResult?.error?.code);
      }
      setErrorMessage(lastSwapResult.error?.message || "");
      return;
    } else if (lastSwapResult && "txid" in lastSwapResult) {
      return;
    }
  }, [lastSwapResult]);

  const waitForTx = async (tx: string, code?: number) => {
    if (connection && code === 7000) {
      try {
        const latestBlockHash = await connection.getLatestBlockhash();
        await connection.confirmTransaction(
          {
            signature: tx,
            blockhash: latestBlockHash.blockhash,
            lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
          },
          "confirmed"
        );

        const transactionResponse = await connection.getTransaction(tx, {
          commitment: "confirmed",
          maxSupportedTransactionVersion: 1,
        });

        if (!fromTokenInfo || !toTokenInfo || !publicKey) {
          setIsChecked(true);
          return;
        }

        const [sourceAddress, destinationAddress] = [
          new PublicKey(fromTokenInfo.address),
          new PublicKey(toTokenInfo.address),
        ].map((mint, idx) => {
          return getAssociatedTokenAddressSync(mint, publicKey);
        });

        const [sourceTokenBalanceChange, destinationTokenBalanceChange] = getTokenBalanceChangesFromTransactionResponse(
          {
            txid: tx,
            inputMint: new PublicKey(fromTokenInfo.address),
            outputMint: new PublicKey(toTokenInfo.address),
            user: publicKey,
            sourceAddress,
            destinationAddress,
            transactionResponse,
            hasWrappedSOL: false,
          }
        );

        setLastSwapResultFix({
          inputAddress: sourceAddress,
          outputAddress: destinationAddress,
          inputAmount: sourceTokenBalanceChange ?? 0,
          outputAmount: destinationTokenBalanceChange ?? 0,
          txid: tx,
        });
      } catch {
      } finally {
        setIsChecked(true);
      }
    } else {
      setIsChecked(true);
    }
  };

  const onGoBack = () => {
    onClose();
    refreshJupiter();
    fetchJupiterState();
    setIsChecked(false);
    setLastSwapResultFix(undefined);
  };

  const swapState: "success" | "error" | "loading" = useMemo(() => {
    const hasErrors = txStatus?.status === "fail";
    if (hasErrors) {
      return "error";
    }

    const allSuccess = txStatus?.status === "success";
    if (txStatus && allSuccess) {
      return "success";
    }

    return "loading";
  }, [txStatus]);

  const ErrorContent = () => {
    return (
      <View style={tw`flex flex-row justify-center`}>
        <View style={tw`flex flex-col items-center justify-center text-center`}>
          <icons.ErrorIcon />
          <Text style={tw`text-primary mt-2`}>Swap Failed</Text>
          <Text style={tw`text-secondary text-xs mt-2`}>We were unable to complete the swap, please try again.</Text>
          {errorMessage ? <Text style={tw`text-secondary text-xs mt-2`}>{errorMessage}</Text> : ""}
        </View>
      </View>
    );
  };

  const _lastSwapResult = useMemo(() => {
    return lastSwapResult && "error" in lastSwapResult ? lastSwapResultFix : lastSwapResult;
  }, [lastSwapResult, lastSwapResultFix]);

  return (
    <View style={tw`flex flex-col h-full w-full py-4 px-2`}>
      <View style={tw`absolute right-4 top-2`}>
        <Pressable style={tw`text-primary`} onPress={() => onGoBack()}>
          <icons.CloseIcon width={14} height={14} color="white" />
        </Pressable>
      </View>

      {swapState === "error" && <ErrorContent />}

      {swapState === "loading" && (
        <View style={tw`pt-4`}>
          <ActivityIndicator size="large" color="#ffff" />
          <Text style={tw`text-center text-primary text-base my-4`}>Confirming transaction</Text>
        </View>
      )}
      {swapState === "success" &&
        (!_lastSwapResult || !fromTokenInfo || !toTokenInfo || !quoteReponseMeta ? (
          <></>
        ) : (
          <View>
            <Text style={tw`text-center text-primary text-base`}>Transaction Success</Text>
            <View style={tw`mt-2 bg-[#25252D] rounded-xl overflow-y-auto w-full webkit-scrollbar py-4 max-h-[260px]`}>
              <View style={tw`mt-2 flex flex-col items-center justify-center text-center px-4]`}>
                <Text style={tw`text-xs font-semibold text-secondary`}>
                  Swapped {fromLamports((_lastSwapResult as any).inputAmount, fromTokenInfo.decimals)}{" "}
                  {fromTokenInfo.symbol} to
                </Text>
                <Text style={tw`text-2xl font-semibold text-secondary`}>
                  {fromLamports((_lastSwapResult as any).outputAmount, toTokenInfo.decimals)} {toTokenInfo.symbol}
                </Text>
              </View>

              <PriceInfo
                quoteResponse={quoteReponseMeta.quoteResponse}
                fromTokenInfo={fromTokenInfo}
                toTokenInfo={toTokenInfo}
                loading={false}
                showFullDetails
              />
            </View>
          </View>
        ))}
    </View>
  );
};
