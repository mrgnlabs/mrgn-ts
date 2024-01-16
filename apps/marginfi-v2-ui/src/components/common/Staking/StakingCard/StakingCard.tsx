import { Dispatch, FC, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { TextField, Typography } from "@mui/material";
import * as solanaStakePool from "@solana/spl-stake-pool";
import { WalletIcon } from "./WalletIcon";
import { PrimaryButton } from "./PrimaryButton";
import { useLstStore } from "~/pages/stake";
import { useUiStore } from "~/store";
import { useWalletContext } from "~/hooks/useWalletContext";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  nativeToUi,
  numeralFormatter,
  percentFormatter,
  uiToNative,
} from "@mrgnlabs/mrgn-common";
import { ArrowDropDown } from "@mui/icons-material";
import { StakingModal } from "./StakingModal";
import Image from "next/image";
import { NumberFormatValues, NumericFormat } from "react-number-format";
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
import { useConnection } from "~/hooks/useConnection";
import { capture } from "~/utils/analytics";
import { SwapMode, useJupiter } from "@jup-ag/react-hook";
import JSBI from "jsbi";
import { StakeData, usePrevious } from "~/utils";
import { createJupiterApiClient } from "@jup-ag/api";
import { SettingsModal } from "./SettingsModal";
import { SettingsIcon } from "./SettingsIcon";
import { LST_MINT, TokenData, TokenDataMap } from "~/store/lstStore";
import { RefreshIcon } from "./RefreshIcon";
import { IconLoader } from "~/components/ui/icons";
import BN from "bn.js";
import debounce from "lodash.debounce";
import { Desktop, Mobile } from "~/mediaQueries";
import { MultiStepToastHandle, showErrorToast } from "~/utils/toastUtils";

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
  const router = useRouter();
  const { connection } = useConnection();
  const { connected, wallet, walletAddress } = useWalletContext();

  const [setIsWalletAuthDialogOpen] = useUiStore((state) => [state.setIsWalletAuthDialogOpen]);
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

  const slippageBps = useMemo(() => slippagePct * 100, [slippagePct]);

  const prevWalletAddress = usePrevious(walletAddress);
  useEffect(() => {
    if ((!walletAddress && prevWalletAddress) || (walletAddress && !prevWalletAddress)) {
      setDepositOption(DEFAULT_DEPOSIT_OPTION);
    }
  }, [walletAddress, prevWalletAddress]);

  useEffect(() => {
    setDepositOption((currentDepositOption) => {
      if (tokenDataMap && router.query.deposit) {
        const tokenData = [...tokenDataMap.values()].find(
          (tokenData) => tokenData.symbol.toLowerCase() === (router.query.deposit as string).toLowerCase()
        );

        if (!tokenData) {
          return currentDepositOption;
        }
        return { type: "token", tokenData, amount: new BN(0) };
      } else if (currentDepositOption.type === "native") {
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
  }, [availableLamports, tokenDataMap, router.query.deposit]);

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

  const showErrotToast = useRef(debounce(() => showErrorToast("Failed to find route"), 250));

  const prevError = usePrevious(error);
  useEffect(() => {
    if (prevError === undefined && error !== undefined) {
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
  }, [error, prevError]);

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
    (event: NumberFormatValues) => {
      if (depositOption.type === "stake") return;

      setDepositOption((currentDepositOption) => {
        const updatedAmount =
          currentDepositOption.type === "native"
            ? uiToNative(event.floatValue ?? 0, 9)
            : currentDepositOption.type === "token"
            ? uiToNative(event.floatValue ?? 0, currentDepositOption.tokenData.decimals)
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

  const onMint = useCallback(async () => {
    if (!lstData || !wallet || !walletAddress) return;

    let sigs = [];

    const {
      value: { blockhash, lastValidBlockHeight },
    } = await connection.getLatestBlockhashAndContext();

    setOngoingAction("minting");

    const multiStepToast = new MultiStepToastHandle("Stake", [{ label: "Minting LST" }]);
    multiStepToast.start();

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
          multiStepToast.setFailed("Route not calculated yet");
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
        const swapSig = await connection.sendTransaction(signedSwapTransaction);
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
        multiStepToast.setFailed("Invalid deposit option");
      }

      multiStepToast.setSuccessAndNext();
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
      multiStepToast.setFailed(errorMsg);
    } finally {
      await Promise.all([refresh(), fetchLstState()]);
      capture("user_stake", {
        amount: depositAmountUi,
      });
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
    depositAmountUi,
  ]);

  return (
    <>
      <div className="relative flex flex-col gap-3 rounded-xl bg-[#1C2023] px-6 sm:px-8 py-4 sm:py-6 max-w-[480px] w-full">
        <div className="flex flex-row justify-between w-full">
          <div className="flex flex-row items-center gap-4">
            <Typography className="font-aeonik font-[400] text-lg">Deposit</Typography>
            {depositOption.type === "token" && (
              <div className="flex flex-row gap-2 items-center">
                <div
                  className="p-2 h-7 w-7 flex flex-row items-center justify-center border rounded-full border-white/10 bg-black/10 text-secondary fill-current cursor-pointer hover:bg-black/20 hover:border-[#DCE85D]/70 hover:shadow-[#DCE85D]/70 transition-all duration-200 ease-in-out"
                  onClick={() => refreshQuoteIfNeeded(true)}
                >
                  <RefreshIcon />
                </div>
                <div
                  className={`p-2 h-7 gap-2 flex flex-row items-center justify-center border rounded-2xl border-white/10 bg-black/10 cursor-pointer hover:bg-black/20 hover:border-[#DCE85D]/70 hover:shadow-[#DCE85D]/70 transition-all duration-200 ease-in-out`}
                  onClick={() => setIsSettingsModalOpen(true)}
                >
                  <SettingsIcon />
                  <Typography className={`text-xs text-secondary mt-2px`}>
                    {isNaN(slippagePct) ? "0" : slippagePct}%
                  </Typography>
                </div>
              </div>
            )}
          </div>

          {connected && (depositOption.type === "native" || depositOption.type === "token") && (
            <div className="flex flex-row items-center gap-1">
              <div className="leading-5">
                <WalletIcon />
              </div>
              <Typography className="font-aeonik font-[400] text-sm leading-5">{maxDepositString}</Typography>
              <button
                className="text-xs ml-1 h-5 py-1 px-1.5 flex flex-row items-center justify-center border rounded-full border-muted-foreground/30 text-muted-foreground cursor-pointer hover:bg-muted-foreground/30 transition-colors"
                onClick={() =>
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
                MAX
              </button>
            </div>
          )}
        </div>

        <NumericFormat
          placeholder="0"
          value={depositAmountUi}
          allowNegative={false}
          disabled={depositOption.type === "stake"}
          decimalScale={9}
          onValueChange={onChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && connected && depositAmountUi !== 0 && !refreshingQuotes && !ongoingAction) {
              onMint();
            }
          }}
          thousandSeparator=","
          customInput={TextField}
          size="small"
          isAllowed={(values) => {
            const { floatValue } = values;
            if (!connected || depositOption.type === "stake") {
              return true;
            }
            const decimals = depositOption.type === "token" ? depositOption.tokenData.decimals : 9;
            const depositAmount = uiToNative(floatValue ?? 0, decimals);
            const maxDepositAmount =
              depositOption.type === "token" ? depositOption.tokenData.balance : depositOption.maxAmount;
            return floatValue ? depositAmount.lt(maxDepositAmount) : true;
          }}
          sx={{
            input: { textAlign: "right", MozAppearance: "textfield" },
            "input::-webkit-inner-spin-button": { WebkitAppearance: "none", margin: 0 },
            "input::-webkit-text-fill-color": "red",
            "& .MuiOutlinedInput-root": {
              "&.Mui-focused fieldset": {
                borderWidth: "0px",
              },
            },
            "& .MuiInputBase-input.Mui-disabled": {
              WebkitTextFillColor: "#e1e1e1",
              cursor: "not-allowed",
            },
          }}
          className="bg-[#0F1111] p-2 rounded-xl"
          InputProps={
            tokenDataMap && solUsdValue
              ? {
                  className: "font-aeonik text-[#e1e1e1] p-0 m-0",
                  startAdornment: (
                    <DropDownButton
                      depositOption={depositOption}
                      availableLamports={availableLamports ?? new BN(0)}
                      solUsdPrice={solUsdValue}
                      tokenDataMap={tokenDataMap}
                      stakeAccounts={stakeAccounts}
                      setDepositOption={setDepositOption}
                    />
                  ),
                }
              : {}
          }
        />

        <div className="flex flex-row justify-between w-full my-auto pt-2">
          <Typography className="font-aeonik font-[400] text-lg">You will receive</Typography>
          <Typography className="font-aeonik font-[700] text-lg sm:text-xl text-[#DCE85D]">
            {lstOutAmount !== null
              ? lstOutAmount < 0.01 && lstOutAmount > 0
                ? "< 0.01"
                : numeralFormatter(lstOutAmount)
              : "-"}{" "}
            $LST
          </Typography>
        </div>
        <div className="h-[36px] my-5">
          <Desktop>
            <PrimaryButton
              disabled={
                connected &&
                (depositAmountUi == 0 ||
                  lstOutAmount === 0 ||
                  lstOutAmount === null ||
                  refreshingQuotes ||
                  !!ongoingAction)
              }
              loading={connected && !!ongoingAction}
              onClick={connected ? onMint : () => setIsWalletAuthDialogOpen(true)}
            >
              {!connected ? (
                "connect"
              ) : ongoingAction ? (
                `${ongoingAction}...`
              ) : refreshingQuotes ? (
                <IconLoader />
              ) : (
                "mint"
              )}
            </PrimaryButton>
          </Desktop>
          <Mobile>
            <PrimaryButton
              disabled={
                !connected ||
                depositAmountUi == 0 ||
                lstOutAmount === 0 ||
                lstOutAmount === null ||
                refreshingQuotes ||
                !!ongoingAction
              }
              loading={connected && !!ongoingAction}
              onClick={connected ? onMint : undefined}
            >
              {ongoingAction ? `${ongoingAction}...` : refreshingQuotes ? <IconLoader /> : "mint"}
            </PrimaryButton>
          </Mobile>
        </div>
        <div className="flex flex-row justify-between w-full my-auto">
          <Typography className="font-aeonik font-[400] text-base">Current price</Typography>
          <Typography className="font-aeonik font-[700] text-lg">
            1 $LST = {lstData ? makeTokenAmountFormatter(3).format(lstData.lstSolValue) : "-"} SOL
          </Typography>
        </div>
        <div className="flex flex-row justify-between w-full my-auto">
          <Typography className="font-aeonik font-[400] text-base">Commission</Typography>
          <Typography className="font-aeonik font-[700] text-lg">{lstData?.solDepositFee ?? 0}%</Typography>
        </div>
        {priceImpactPct !== null && (
          <div
            className={`flex flex-row justify-between w-full my-auto ${
              priceImpactPct > 0.1 ? "text-[#FF6B6B]" : priceImpactPct > 0.02 ? "text-[#FFB06B]" : "text-[#fff]"
            }`}
          >
            <Typography className={`font-aeonik font-[400] text-base`}>Price impact</Typography>
            <Typography className="font-aeonik font-[700] text-lg">
              {priceImpactPct < 0.01 ? "< 0.01%" : `~ ${percentFormatter.format(priceImpactPct)}`}
            </Typography>
          </div>
        )}
      </div>
      <SettingsModal
        isOpen={isSettingsModalOpen}
        handleClose={() => setIsSettingsModalOpen(false)}
        selectedSlippagePercent={slippagePct}
        setSelectedSlippagePercent={setSlippagePct}
      />
    </>
  );
};

interface DropDownButtonProps {
  availableLamports: BN;
  solUsdPrice: number;
  tokenDataMap: TokenDataMap;
  stakeAccounts: StakeData[];
  depositOption: DepositOption;
  setDepositOption: Dispatch<SetStateAction<DepositOption>>;
  disabled?: boolean;
}

const DropDownButton: FC<DropDownButtonProps> = ({
  availableLamports,
  solUsdPrice,
  tokenDataMap,
  stakeAccounts,
  depositOption,
  setDepositOption,
  disabled,
}) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

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

  return (
    <>
      <div
        onClick={() => setIsModalOpen(true)}
        className={`flex flex-row justify-between items-center py-2 px-3 text-white bg-[#303030] rounded-lg ${
          disabled ? "opacity-50" : "cursor-pointer hover:bg-[#2D2D2D]"
        }`}
      >
        <div className="w-[24px] mr-2">
          <Image src={iconUrl} alt="token logo" height={24} width={24} className="rounded-full" />
        </div>
        <Typography className="font-aeonik font-[500] text-lg mr-1">{optionName}</Typography>
        <ArrowDropDown sx={{ width: "20px", padding: 0 }} />
      </div>

      <StakingModal
        isOpen={isModalOpen}
        handleClose={() => setIsModalOpen(false)}
        availableLamports={availableLamports}
        solUsdPrice={solUsdPrice}
        tokenDataMap={tokenDataMap}
        stakeAccounts={stakeAccounts}
        depositOption={depositOption}
        setDepositOption={setDepositOption}
      />
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
