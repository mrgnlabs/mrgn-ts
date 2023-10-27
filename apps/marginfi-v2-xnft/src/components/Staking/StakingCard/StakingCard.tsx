import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, View, Text, Image } from "react-native";
import { nativeToUi, numeralFormatter, percentFormatter, uiToNative } from "@mrgnlabs/mrgn-common";
import { PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { SwapMode, useJupiter } from "@jup-ag/react-hook";
import { createJupiterApiClient } from "@jup-ag/api";
import JSBI from "jsbi";
import BN from "bn.js";
import debounce from "lodash.debounce";
import Modal from "react-native-modal";

import tw from "~/styles/tailwind";
import { LST_MINT } from "~/store/lstStore";
import { ChevronDownIcon, RefreshIcon, SettingsIcon, WalletIcon } from "~/assets/icons";
import { useLstStore } from "~/store/store";
import { NumberInput, PrimaryButton } from "~/components/Common";
import { useConnection } from "~/context/ConnectionContext";
import { useWallet } from "~/context/WalletContext";
import { showErrorToast, showSuccessToast } from "~/utils";

import { SettingsModal } from "./Modals/SettingsModal";
import {
  DepositOption,
  OngoingAction,
  makeDepositSolToStakePoolIx,
  makeDepositStakeToStakePoolIx,
  makeTokenAmountFormatter,
} from "./StakingCard.utils";
import * as _consts from "./StakingCard.consts";
import { StakingModal } from "./Modals";

export const StakingCard: FC = () => {
  const { connection } = useConnection();
  const { wallet, publicKey: walletAddress } = useWallet();
  const [
    lstData,
    userDataFetched,
    tokenDataMap,
    stakeAccounts,
    fetchLstState,
    slippagePct,
    setSlippagePct,
    availableLamports,
    solUsdValue,
  ] = useLstStore((state) => [
    state.lstData,
    state.userDataFetched,
    state.tokenDataMap,
    state.stakeAccounts,
    state.fetchLstState,
    state.slippagePct,
    state.setSlippagePct,
    state.availableLamports,
    state.solUsdValue,
  ]);

  const jupiterApiClient = createJupiterApiClient();

  const [ongoingAction, setOngoingAction] = useState<OngoingAction | null>(null);
  const [refreshingQuotes, setRefreshingQuotes] = useState<boolean>(false);
  const [depositOption, setDepositOption] = useState<DepositOption>(_consts.DEFAULT_DEPOSIT_OPTION);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isStakeModalOpen, setIsStakeModalOpen] = useState<boolean>(false);

  const slippageBps = useMemo(() => slippagePct * 100, [slippagePct]);
  const [iconUrl, optionName] = useMemo(() => {
    if (depositOption.type === "native") {
      return [_consts.SOL_LOGO_URL, "SOL"];
    } else if (depositOption.type === "stake") {
      return [_consts.SOL_LOGO_URL, "Stake"];
    } else {
      return [depositOption.tokenData.iconUrl, depositOption.tokenData.symbol];
    }
  }, [depositOption]);

  useEffect(() => {
    setDepositOption((currentDepositOption) => {
      if (currentDepositOption.type === "native") {
        return {
          ...currentDepositOption,
          maxAmount: availableLamports ?? new BN(0),
        };
      } else if (currentDepositOption.type === "token") {
        if (!tokenDataMap) return currentDepositOption;
        return {
          ...currentDepositOption,
          maxAmount: tokenDataMap.get(currentDepositOption.tokenData.address)?.balance ?? 0,
        };
      } else {
        return currentDepositOption;
      }
    });
  }, [availableLamports, tokenDataMap]);

  const depositAmountUi = useMemo(() => {
    return depositOption.type === "native"
      ? nativeToUi(depositOption.amount, 9)
      : depositOption.type === "token"
      ? nativeToUi(depositOption.amount, depositOption.tokenData.decimals)
      : nativeToUi(depositOption.stakeData.lamports, 9);
  }, [depositOption]);

  const {
    quoteResponseMeta,
    loading: loadingQuotes,
    refresh,
    lastRefreshTimestamp,
    error,
  } = useJupiter({
    amount:
      depositOption.type === "stake" || depositOption.type === "native"
        ? JSBI.BigInt(0)
        : JSBI.BigInt(depositOption.amount), // amountIn trick to avoid Jupiter calls when depositing stake or native SOL
    inputMint: depositOption.type === "token" ? new PublicKey(depositOption.tokenData.address) : undefined,
    outputMint: LST_MINT,
    swapMode: SwapMode.ExactIn,
    slippageBps,
    debounceTime: 250,
  });

  const priceImpactPct: number | null = useMemo(() => {
    if (!quoteResponseMeta?.quoteResponse) return null;
    return Number(quoteResponseMeta.quoteResponse.priceImpactPct);
  }, [quoteResponseMeta?.quoteResponse]);

  const refreshQuoteIfNeeded = useCallback(
    (force: boolean = false) => {
      const hasExpired = Date.now() - lastRefreshTimestamp > _consts.QUOTE_EXPIRY_MS;
      if (depositOption.type === "token" && depositOption.amount.gtn(0) && (hasExpired || force)) {
        setRefreshingQuotes(true);
        refresh();
      }
    },
    [depositOption, refresh, lastRefreshTimestamp]
  );

  const showErrotToast = useRef(debounce(() => showErrorToast("Failed to find route"), 250));

  useEffect(() => {
    if (error !== undefined) {
      setDepositOption((currentDepositOption) => {
        if (currentDepositOption.type === "token" && currentDepositOption.amount.gtn(0)) {
          showErrotToast.current();
          return {
            ...currentDepositOption,
            amount: new BN(0),
          };
        } else {
          return currentDepositOption;
        }
      });
    }
  }, [error]);

  useEffect(() => {
    if (!loadingQuotes) {
      setTimeout(() => setRefreshingQuotes(false), 500);
    }
  }, [loadingQuotes]);

  const lstOutAmount: number = useMemo(() => {
    if (!depositOption || !lstData?.lstSolValue) return 0;

    if (depositOption.type === "native") {
      return nativeToUi(depositOption.amount, 9) / lstData.lstSolValue;
    } else if (depositOption.type === "stake") {
      return nativeToUi(depositOption.stakeData.lamports, 9) / lstData.lstSolValue;
    } else {
      if (quoteResponseMeta?.quoteResponse?.outAmount) {
        return JSBI.toNumber(quoteResponseMeta?.quoteResponse?.outAmount) / 1e9;
      } else {
        return 0;
      }
    }
  }, [depositOption, lstData?.lstSolValue, quoteResponseMeta?.quoteResponse?.outAmount]);

  const onChange = useCallback(
    (value: string) => {
      if (depositOption.type === "stake") return;

      setDepositOption((currentDepositOption) => {
        const updatedAmount =
          currentDepositOption.type === "native"
            ? uiToNative(value ?? 0, 9)
            : currentDepositOption.type === "token"
            ? uiToNative(value ?? 0, currentDepositOption.tokenData.decimals)
            : currentDepositOption.stakeData.lamports;

        return {
          ...currentDepositOption,
          amount: updatedAmount,
        };
      });
    },
    [depositOption.type]
  );

  const maxDepositString = useMemo(() => {
    if (!userDataFetched) return "-";
    if (depositOption.type === "token") {
      const maxUi = nativeToUi(depositOption.tokenData.balance, depositOption.tokenData.decimals);
      return maxUi < 0.01 ? "< 0.01" : numeralFormatter(maxUi);
    } else if (depositOption.type === "native") {
      const maxUi = nativeToUi(depositOption.maxAmount, 9);
      return maxUi < 0.01 ? "< 0.01" : numeralFormatter(maxUi);
    }
    return "-";
  }, [userDataFetched, depositOption]);

  const maxDepositValue = useMemo(() => {
    if (depositOption.type === "stake") {
      return 0;
    }
    const decimals = depositOption.type === "token" ? depositOption.tokenData.decimals : 9;
    const maxDepositAmount =
      (depositOption.type === "token" ? depositOption.tokenData.balance : depositOption.maxAmount).toNumber() /
      Math.pow(10, decimals);
    return maxDepositAmount;
  }, [depositOption]);

  const onMint = useCallback(async () => {
    if (!lstData || !wallet || !walletAddress || !connection) return;

    let sigs = [];

    const {
      value: { blockhash, lastValidBlockHeight },
    } = await connection.getLatestBlockhashAndContext();

    setOngoingAction("minting");

    try {
      if (depositOption.type === "stake") {
        const { instructions, signers } = await makeDepositStakeToStakePoolIx(
          lstData.accountData,
          lstData.poolAddress,
          walletAddress,
          depositOption.stakeData.validatorVoteAddress,
          depositOption.stakeData.address
        );

        const depositMessage = new TransactionMessage({
          instructions: instructions,
          payerKey: walletAddress,
          recentBlockhash: blockhash,
        });

        const depositTransaction = new VersionedTransaction(depositMessage.compileToV0Message([]));
        depositTransaction.sign(signers);

        const signedTransaction = await wallet.signTransaction(depositTransaction);
        const depositSig = await connection.sendTransaction(signedTransaction);

        sigs.push(depositSig);
      } else if (depositOption.type === "token") {
        const quote = quoteResponseMeta?.original;
        if (!quote) {
          console.error("Route not calculated yet");
          return;
        }

        const { swapTransaction: swapTransactionEncoded, lastValidBlockHeight } = await jupiterApiClient.swapPost({
          swapRequest: {
            quoteResponse: quote,
            userPublicKey: walletAddress.toBase58(),
            wrapAndUnwrapSol: false,
          },
        });
        const swapTransactionBuffer = Buffer.from(swapTransactionEncoded, "base64");
        const swapTransaction = VersionedTransaction.deserialize(swapTransactionBuffer);
        swapTransaction.message.recentBlockhash = blockhash; // Needed for bug from jupiter regarding faulty blockhash returned
        const signedSwapTransaction = await wallet.signTransaction(swapTransaction);

        const swapSig = await connection.sendTransaction(signedSwapTransaction, { maxRetries: 5 });

        await connection.confirmTransaction(
          {
            blockhash,
            lastValidBlockHeight,
            signature: swapSig,
          },
          "confirmed"
        );
      } else if (depositOption.type === "native") {
        const { instructions, signers } = await makeDepositSolToStakePoolIx(
          lstData.accountData,
          lstData.poolAddress,
          walletAddress,
          depositOption.amount,
          undefined
        );

        const depositMessage = new TransactionMessage({
          instructions: instructions,
          payerKey: walletAddress,
          recentBlockhash: blockhash,
        });

        const depositTransaction = new VersionedTransaction(depositMessage.compileToV0Message([]));
        depositTransaction.sign(signers);

        const signedTransaction = await wallet.signTransaction(depositTransaction);
        const depositSig = await connection.sendTransaction(signedTransaction);
        await connection.confirmTransaction(
          {
            blockhash,
            lastValidBlockHeight,
            signature: depositSig,
          },
          "confirmed"
        );
      } else {
        throw new Error("Invalid deposit option");
      }

      showSuccessToast("Minting complete");
    } catch (error: any) {
      if (error.logs) {
        console.log("------ Logs 👇 ------");
        console.log(error.logs.join("\n"));
      }
      console.log(error);
      let errorMsg = typeof error === "string" ? error : error?.message;
      if (errorMsg) {
        errorMsg = errorMsg ? errorMsg : "Transaction failed!";
      }
      showErrorToast(errorMsg);
    } finally {
      await Promise.all([refresh(), fetchLstState()]);
      setDepositOption((currentDepositOption) =>
        currentDepositOption.type === "stake"
          ? _consts.DEFAULT_DEPOSIT_OPTION
          : { ...currentDepositOption, amount: new BN(0) }
      );
      setOngoingAction(null);
    }
  }, [
    lstData,
    wallet,
    walletAddress,
    depositOption,
    connection,
    quoteResponseMeta?.original,
    jupiterApiClient,
    refresh,
    fetchLstState,
  ]);

  return (
    <>
      <View style={tw`relative flex flex-col gap-3 rounded-xl bg-[#1C2023] px-4 py-4 sm:py-6 max-w-[480px] w-full`}>
        <View style={tw`flex flex-row justify-between w-full`}>
          <View style={tw`flex flex-row items-center gap-4`}>
            <Text style={tw`font-aeonik font-[400] text-lg text-primary`}>Deposit</Text>
            {depositOption.type === "token" && (
              <View style={tw`flex flex-row gap-2 items-center`}>
                <Pressable
                  style={tw`p-2 h-7 w-7 flex flex-row items-center justify-center border rounded-full border-white/10 bg-black/10 text-secondary cursor-pointer`}
                  onPress={() => refreshQuoteIfNeeded(true)}
                >
                  <RefreshIcon />
                </Pressable>
                <Pressable
                  style={tw`p-2 h-7 gap-2 flex flex-row items-center justify-center border rounded-2xl border-white/10 bg-black/10 cursor-pointer`}
                  onPress={() => setIsSettingsModalOpen(true)}
                >
                  <SettingsIcon color="white" />
                  <Text style={tw`text-xs text-secondary mt-2px`}>{isNaN(slippagePct) ? "0" : slippagePct}%</Text>
                </Pressable>
              </View>
            )}
          </View>

          {connection && (depositOption.type === "native" || depositOption.type === "token") && (
            <View style={tw`flex flex-row items-center gap-1`}>
              <View style={tw`leading-5`}>
                <WalletIcon height={18} width={18} />
              </View>
              <Text style={tw`font-aeonik font-[400] text-sm leading-5 text-primary`}>{maxDepositString}</Text>
              <Pressable
                style={tw`p-2 ml-1 h-5 flex flex-row items-center justify-center border rounded-full border-white/10 bg-black/10 cursor-pointer`}
                onPress={() =>
                  setDepositOption((currentDepositOption) => {
                    const updatedAmount =
                      currentDepositOption.type === "native"
                        ? currentDepositOption.maxAmount
                        : currentDepositOption.type === "token"
                        ? currentDepositOption.tokenData.balance
                        : new BN(currentDepositOption.stakeData.lamports);

                    return {
                      ...currentDepositOption,
                      amount: updatedAmount,
                    };
                  })
                }
              >
                <Text style={tw`text-secondary text-sm`}>MAX</Text>
              </Pressable>
            </View>
          )}
        </View>
        <View style={tw`flex flex-row relative bg-[#0f1111] p-2 rounded-xl`}>
          <Pressable
            style={tw`flex flex-row justify-between px-12px py-8px w-124px rounded-xl bg-[#303030]`}
            onPress={() => setIsStakeModalOpen(true)}
          >
            <View style={tw`my-auto`}>
              <Image style={{ height: 20, width: 20 }} source={{ uri: iconUrl }} />
            </View>
            <View style={tw`flex flex-row mt-4px`}>
              <Text style={tw`text-primary text-base`}>{optionName}</Text>
            </View>
            <View style={tw`mt-5px`}>
              <ChevronDownIcon />
            </View>
          </Pressable>
          <NumberInput
            textAlign="right"
            hasBorder={false}
            placeholder="0"
            amount={depositAmountUi.toString()}
            min={0}
            max={maxDepositValue}
            disabled={depositOption.type === "stake"}
            decimals={9}
            onValueChange={onChange}
            wrapperStyle={tw`flex-1`}
          />
        </View>

        <View style={tw`flex flex-row justify-between w-full my-auto pt-2`}>
          <Text style={tw`font-aeonik font-[400] text-lg text-primary`}>You will receive</Text>
          <Text style={tw`font-aeonik font-[700] text-lg sm:text-xl text-[#DCE85D]`}>
            {lstOutAmount !== null
              ? lstOutAmount < 0.01 && lstOutAmount > 0
                ? "< 0.01"
                : numeralFormatter(lstOutAmount)
              : "-"}{" "}
            $LST
          </Text>
        </View>
        <View style={tw`h-[36px] my-5`}>
          <PrimaryButton
            title={ongoingAction ? `${ongoingAction}...` : refreshingQuotes ? "Refreshing .." : "Mint"}
            onPress={onMint}
            isDisabled={
              depositAmountUi == 0 || lstOutAmount === 0 || lstOutAmount === null || refreshingQuotes || !!ongoingAction
            }
          />
        </View>
        <View style={tw`flex flex-row justify-between w-full my-auto`}>
          <Text style={tw`font-aeonik font-[400] text-base text-primary`}>Current price</Text>
          <Text style={tw`font-aeonik font-[700] text-lg text-primary`}>
            1 $LST = {lstData ? makeTokenAmountFormatter(3).format(lstData.lstSolValue) : "-"} SOL
          </Text>
        </View>
        <View style={tw`flex flex-row justify-between w-full my-auto`}>
          <Text style={tw`font-aeonik font-[400] text-base text-primary`}>Commission</Text>
          <Text style={tw`font-aeonik font-[700] text-lg text-primary`}>{lstData?.solDepositFee ?? 0}%</Text>
        </View>
        {priceImpactPct !== null && (
          <View
            style={tw`flex flex-row justify-between w-full my-auto ${
              priceImpactPct > 0.1 ? "text-[#FF6B6B]" : priceImpactPct > 0.02 ? "text-[#FFB06B]" : "text-[#fff]"
            }`}
          >
            <Text style={tw`font-aeonik font-[400] text-base text-primary`}>Price impact</Text>
            <Text style={tw`font-aeonik font-[700] text-lg text-primary`}>
              {priceImpactPct < 0.01 ? "< 0.01%" : `~ ${percentFormatter.format(priceImpactPct)}`}
            </Text>
          </View>
        )}
      </View>

      <Modal
        isVisible={isSettingsModalOpen}
        coverScreen={true}
        onBackdropPress={() => {
          setIsSettingsModalOpen(false);
        }}
      >
        <SettingsModal
          handleClose={() => setIsSettingsModalOpen(false)}
          selectedSlippagePercent={slippagePct}
          setSelectedSlippagePercent={setSlippagePct}
        />
      </Modal>

      <Modal
        isVisible={isStakeModalOpen}
        coverScreen={true}
        onBackdropPress={() => {
          setIsStakeModalOpen(false);
        }}
      >
        {/* <View style={tw``}>
          <View style={tw`bg-[#1C2125]`}> */}
        <StakingModal
          handleClose={() => setIsStakeModalOpen(false)}
          availableLamports={availableLamports}
          solUsdPrice={solUsdValue ?? 0}
          tokenDataMap={tokenDataMap ?? new Map()}
          stakeAccounts={stakeAccounts}
          depositOption={depositOption}
          setDepositOption={setDepositOption}
        />
        {/* </View>
        </View> */}
      </Modal>
    </>
  );
};
