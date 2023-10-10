import React, { Dispatch, FC, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as solanaStakePool from "@solana/spl-stake-pool";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  nativeToUi,
  numeralFormatter,
  percentFormatter,
  uiToNative,
} from "@mrgnlabs/mrgn-common";
// import { StakingModal } from "./StakingModal";
import {
  AddressLookupTableAccount,
  Connection,
  Keypair,
  PublicKey,
  Signer,
  StakeAuthorizationLayout,
  StakeProgram,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { SwapMode, useJupiter } from "@jup-ag/react-hook";
import JSBI from "jsbi";
import { StakeData } from "~/utils";
import { createJupiterApiClient } from "@jup-ag/api";
import { toast } from "react-toastify";
import { LST_MINT, TokenData } from "~/store/lstStore";
import BN from "bn.js";
import debounce from "lodash.debounce";
import Modal from "react-native-modal";
import { ChevronDownIcon, RefreshIcon, SettingsIcon, WalletIcon } from "~/assets/icons";
import tw from "~/styles/tailwind";
import { Pressable, View, Text, Image } from "react-native";
import { NumberInput, PrimaryButton } from "../Common";
import { useWallet } from "~/hooks/useWallet";
import { useConnection } from "~/hooks/useConnection";
import { useLstStore } from "~/store/store";
import { StakingModal } from "./StakingModal";
import { SettingsModal } from "./SettingsModal";

const QUOTE_EXPIRY_MS = 30_000;
const DEFAULT_DEPOSIT_OPTION: DepositOption = { type: "native", amount: new BN(0), maxAmount: new BN(0) };

type OngoingAction = "swapping" | "minting";

export type DepositOption =
  | {
      type: "native";
      amount: BN;
      maxAmount: BN;
    }
  | {
      type: "token";
      tokenData: TokenData;
      amount: BN;
    }
  | {
      type: "stake";
      stakeData: StakeData;
    };

export const StakingCard: FC = () => {
  const connection = useConnection();
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
  const [depositOption, setDepositOption] = useState<DepositOption>(DEFAULT_DEPOSIT_OPTION);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isStakeModalOpen, setIsStakeModalOpen] = useState<boolean>(false);

  const slippageBps = useMemo(() => slippagePct * 100, [slippagePct]);
  const [iconUrl, optionName] = useMemo(() => {
    if (depositOption.type === "native") {
      return [
        "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
        "SOL",
      ];
    } else if (depositOption.type === "stake") {
      return [
        "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
        "Stake",
      ];
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
      const hasExpired = Date.now() - lastRefreshTimestamp > QUOTE_EXPIRY_MS;
      if (depositOption.type === "token" && depositOption.amount.gtn(0) && (hasExpired || force)) {
        setRefreshingQuotes(true);
        refresh();
      }
    },
    [depositOption, refresh, lastRefreshTimestamp]
  );

  const showErrotToast = useRef(debounce(() => toast.error("Failed to find route"), 250));

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

      toast.success("Minting complete");
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
      toast.error(errorMsg);
    } finally {
      await Promise.all([refresh(), fetchLstState()]);
      setDepositOption((currentDepositOption) =>
        currentDepositOption.type === "stake" ? DEFAULT_DEPOSIT_OPTION : { ...currentDepositOption, amount: new BN(0) }
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

export function makeTokenAmountFormatter(decimals: number) {
  return new Intl.NumberFormat("en-US", {
    useGrouping: true,
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

/**
 * Creates instructions required to deposit sol to stake pool.
 */
async function makeDepositSolToStakePoolIx(
  stakePool: solanaStakePool.StakePool,
  stakePoolAddress: PublicKey,
  from: PublicKey,
  lamports: BN,
  destinationTokenAccount?: PublicKey,
  referrerTokenAccount?: PublicKey,
  depositAuthority?: PublicKey
) {
  // Ephemeral SOL account just to do the transfer
  const userSolTransfer = new Keypair();
  const signers: Signer[] = [userSolTransfer];
  const instructions: TransactionInstruction[] = [];

  // Create the ephemeral SOL account
  instructions.push(
    SystemProgram.transfer({
      fromPubkey: from,
      toPubkey: userSolTransfer.publicKey,
      lamports: lamports.toNumber(),
    })
  );

  // Create token account if not specified
  if (!destinationTokenAccount) {
    const associatedAddress = getAssociatedTokenAddressSync(stakePool.poolMint, from, true);
    instructions.push(
      createAssociatedTokenAccountIdempotentInstruction(from, associatedAddress, from, stakePool.poolMint)
    );
    destinationTokenAccount = associatedAddress;
  }

  const withdrawAuthority = findWithdrawAuthorityProgramAddress(
    solanaStakePool.STAKE_POOL_PROGRAM_ID,
    stakePoolAddress
  );

  instructions.push(
    solanaStakePool.StakePoolInstruction.depositSol({
      stakePool: stakePoolAddress,
      reserveStake: stakePool.reserveStake,
      fundingAccount: userSolTransfer.publicKey,
      destinationPoolAccount: destinationTokenAccount,
      managerFeeAccount: stakePool.managerFeeAccount,
      referralPoolAccount: referrerTokenAccount ?? destinationTokenAccount,
      poolMint: stakePool.poolMint,
      lamports: lamports.toNumber(),
      withdrawAuthority,
      depositAuthority,
    })
  );

  return {
    instructions,
    signers,
  };
}

/**
 * Creates instructions required to deposit stake to stake pool.
 */
export async function makeDepositStakeToStakePoolIx(
  stakePool: solanaStakePool.StakePool,
  stakePoolAddress: PublicKey,
  walletAddress: PublicKey,
  validatorVote: PublicKey,
  depositStake: PublicKey
) {
  const withdrawAuthority = findWithdrawAuthorityProgramAddress(
    solanaStakePool.STAKE_POOL_PROGRAM_ID,
    stakePoolAddress
  );

  const validatorStake = findStakeProgramAddress(
    solanaStakePool.STAKE_POOL_PROGRAM_ID,
    validatorVote,
    stakePoolAddress
  );

  const instructions: TransactionInstruction[] = [];
  const signers: Signer[] = [];

  const poolMint = stakePool.poolMint;

  const poolTokenReceiverAccount = getAssociatedTokenAddressSync(poolMint, walletAddress, true);
  instructions.push(
    createAssociatedTokenAccountIdempotentInstruction(walletAddress, poolTokenReceiverAccount, walletAddress, poolMint)
  );

  instructions.push(
    ...StakeProgram.authorize({
      stakePubkey: depositStake,
      authorizedPubkey: walletAddress,
      newAuthorizedPubkey: stakePool.stakeDepositAuthority,
      stakeAuthorizationType: StakeAuthorizationLayout.Staker,
    }).instructions
  );

  instructions.push(
    ...StakeProgram.authorize({
      stakePubkey: depositStake,
      authorizedPubkey: walletAddress,
      newAuthorizedPubkey: stakePool.stakeDepositAuthority,
      stakeAuthorizationType: StakeAuthorizationLayout.Withdrawer,
    }).instructions
  );

  instructions.push(
    solanaStakePool.StakePoolInstruction.depositStake({
      stakePool: stakePoolAddress,
      validatorList: stakePool.validatorList,
      depositAuthority: stakePool.stakeDepositAuthority,
      reserveStake: stakePool.reserveStake,
      managerFeeAccount: stakePool.managerFeeAccount,
      referralPoolAccount: poolTokenReceiverAccount,
      destinationPoolAccount: poolTokenReceiverAccount,
      withdrawAuthority,
      depositStake,
      validatorStake,
      poolMint,
    })
  );

  return {
    instructions,
    signers,
  };
}

/**
 * Generates the withdraw authority program address for the stake pool
 */
function findWithdrawAuthorityProgramAddress(programId: PublicKey, stakePoolAddress: PublicKey) {
  const [publicKey] = PublicKey.findProgramAddressSync(
    [stakePoolAddress.toBuffer(), Buffer.from("withdraw")],
    programId
  );
  return publicKey;
}

/**
 * Generates the stake program address for a validator's vote account
 */
function findStakeProgramAddress(programId: PublicKey, voteAccountAddress: PublicKey, stakePoolAddress: PublicKey) {
  const [publicKey] = PublicKey.findProgramAddressSync(
    [voteAccountAddress.toBuffer(), stakePoolAddress.toBuffer()],
    programId
  );
  return publicKey;
}

export const getAdressLookupTableAccounts = async (
  connection: Connection,
  keys: string[]
): Promise<AddressLookupTableAccount[]> => {
  const addressLookupTableAccountInfos = await connection.getMultipleAccountsInfo(
    keys.map((key) => new PublicKey(key))
  );

  return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
    const addressLookupTableAddress = keys[index];
    if (accountInfo) {
      const addressLookupTableAccount = new AddressLookupTableAccount({
        key: new PublicKey(addressLookupTableAddress),
        state: AddressLookupTableAccount.deserialize(accountInfo.data),
      });
      acc.push(addressLookupTableAccount);
    }

    return acc;
  }, new Array<AddressLookupTableAccount>());
};
