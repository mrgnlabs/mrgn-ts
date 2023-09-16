import { Dispatch, FC, SetStateAction, useCallback, useEffect, useMemo, useState } from "react";
import { TextField, Typography, CircularProgress } from "@mui/material";
import * as solanaStakePool from "@solana/spl-stake-pool";
import { WalletIcon } from "./WalletIcon";
import { PrimaryButton } from "./PrimaryButton";
import { useLstStore } from "~/pages/stake";
import { useWalletContext } from "~/components/useWalletContext";
import { Wallet, numeralFormatter, processTransaction, shortenAddress } from "@mrgnlabs/mrgn-common";
import { ArrowDropDown } from "@mui/icons-material";
import { StakingModal } from "./StakingModal";
import Image from "next/image";
import { NumberFormatValues, NumericFormat } from "react-number-format";
import { Connection, PublicKey, Transaction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";
import { SwapMode, useJupiter } from "@jup-ag/react-hook";
import JSBI from "jsbi";
import { usePrevious } from "~/utils";
import { createJupiterApiClient, instanceOfSwapResponse } from "@jup-ag/api";
import { toast } from "react-toastify";
import { SettingsModal, SupportedSlippagePercent } from "./SettingsModal";
import { SettingsIcon } from "./SettingsIcon";
import { SOL_MINT, TokenData, TokenDataMap } from "~/store/lstStore";

const LST_FORMATTER = makeTokenAmountFormatter(9);
const DEFAULT_SLIPPAGE_PERCENT = 1;

export const StakingCard: FC = () => {
  const { connection } = useConnection();
  const { connected, wallet, walletAddress, openWalletSelector } = useWalletContext();
  const [lstData, tokenDataMap, fetchLstState] = useLstStore((state) => [
    state.lstData,
    state.tokenDataMap,
    state.fetchLstState,
  ]);

  const jupiterApiClient = createJupiterApiClient();

  const [swapping, setSwapping] = useState<boolean>(false);
  const [depositAmount, setDepositAmount] = useState<number | null>(null);
  const [selectedMint, setSelectedMint] = useState<PublicKey>(SOL_MINT);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [selectedSlippagePercent, setSelectedSlippagePercent] =
    useState<SupportedSlippagePercent>(DEFAULT_SLIPPAGE_PERCENT);

  const selectedSlippageBps = useMemo(() => selectedSlippagePercent * 100, [selectedSlippagePercent]);

  const prevSelectedMint = usePrevious(selectedMint);
  useEffect(() => {
    if (selectedMint?.toBase58() !== prevSelectedMint?.toBase58()) {
      setDepositAmount(0);
    }
  }, [selectedMint, prevSelectedMint]);

  const prevWalletAddress = usePrevious(walletAddress);
  useEffect(() => {
    if ((!walletAddress && prevWalletAddress) || (walletAddress && !prevWalletAddress)) {
      setDepositAmount(0);
    }
  }, [walletAddress, prevWalletAddress]);

  const selectedMintInfo: TokenData | null = useMemo(() => {
    if (tokenDataMap === null) return null;
    return tokenDataMap.get(selectedMint.toString()) ?? null;
  }, [tokenDataMap, selectedMint]);

  const rawDepositAmount = useMemo(
    () => Math.trunc(Math.pow(10, selectedMintInfo?.decimals ?? 0) * (depositAmount ?? 0)),
    [depositAmount, selectedMintInfo]
  );

  const {
    quoteResponseMeta,
    loading: loadingQuotes,
    refresh,
  } = useJupiter({
    amount: JSBI.BigInt(rawDepositAmount), // raw input amount of tokens
    inputMint: selectedMint,
    outputMint: SOL_MINT,
    swapMode: SwapMode.ExactIn,
    slippageBps: selectedSlippageBps, // 0.5% slippage
    debounceTime: 250, // debounce ms time before refresh
  });

  const lstOutAmount: number | null = useMemo(() => {
    if (depositAmount === null) return null;
    if (!selectedMint || !lstData?.lstSolValue) return 0;

    if (selectedMint.equals(SOL_MINT)) {
      return depositAmount / lstData.lstSolValue;
    } else {
      if (quoteResponseMeta?.quoteResponse?.outAmount) {
        const outAmount = JSBI.toNumber(quoteResponseMeta?.quoteResponse?.outAmount) / 1e9; // adding decimals for SOL
        return outAmount / lstData.lstSolValue;
      } else {
        return 0;
      }
    }
  }, [depositAmount, selectedMint, lstData?.lstSolValue, quoteResponseMeta?.quoteResponse?.outAmount]);

  const onChange = useCallback(
    (event: NumberFormatValues) => setDepositAmount(event.floatValue ?? null),
    [setDepositAmount]
  );

  const onMint = useCallback(async () => {
    if (!lstData || !wallet || !walletAddress || !depositAmount) return;
    console.log("depositing", depositAmount, selectedMint);

    let sigs = [];

    setSwapping(true);

    const {
      value: { blockhash, lastValidBlockHeight },
    } = await connection.getLatestBlockhashAndContext();

    try {
      if (selectedMint.equals(SOL_MINT)) {
        const sig = await depositToken(lstData.poolAddress, depositAmount, selectedMint, connection, wallet);
        sigs.push(sig);
      } else {
        if (!quoteResponseMeta?.quoteResponse) {
          throw new Error("Route not calculated yet");
        }
        const outAmount = JSBI.toNumber(quoteResponseMeta.quoteResponse.outAmount);
        const finalAmount = Math.floor(outAmount * (1 - selectedSlippagePercent / 100));

        const avoidSlippageIssues = await jupiterApiClient.quoteGet({
          amount: finalAmount, // add slippage
          inputMint: selectedMint.toBase58(),
          outputMint: SOL_MINT.toBase58(),
          swapMode: SwapMode.ExactOut,
          slippageBps: selectedSlippageBps,
        });

        const swapResult = await jupiterApiClient.swapPost({
          swapRequest: {
            quoteResponse: avoidSlippageIssues, //  quoteResponseMeta.original
            userPublicKey: walletAddress.toBase58(),
            wrapAndUnwrapSol: true,
            // asLegacyTransaction: true,
          },
        });

        if (instanceOfSwapResponse(swapResult)) {
          const { swapTransaction: swapTransactionSerialized } = swapResult;
          const swapTransactionBuffer = Buffer.from(swapTransactionSerialized, "base64");
          const swapTransaction = VersionedTransaction.deserialize(swapTransactionBuffer); //Transaction.from(swapTransactionBuffer); //

          const { instructions, signers } = await solanaStakePool.depositSol(
            connection,
            lstData.poolAddress,
            wallet.publicKey,
            finalAmount,
            undefined
          );

          const depositMessage = new TransactionMessage({
            instructions: instructions,
            payerKey: walletAddress,
            recentBlockhash: blockhash,
          });

          const depositTransaction = new VersionedTransaction(depositMessage.compileToV0Message([]));
          depositTransaction.sign(signers);

          const versionedTransactions = await wallet.signAllTransactions([swapTransaction, depositTransaction]);

          const swapSig = await connection.sendTransaction(versionedTransactions[0]); //TODO confirm
          sigs.push(swapSig);
          const depositSig = await connection.sendTransaction(versionedTransactions[1]); //TODO confirm
          sigs.push(depositSig);
        }
      }

      await Promise.all(
        sigs.map((sig) =>
          connection.confirmTransaction(
            {
              blockhash,
              lastValidBlockHeight,
              signature: sig,
            },
            "confirmed"
          )
        )
      );
      toast.success("Staking complete");
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
      setDepositAmount(0);
      setSwapping(false);
    }
  }, [
    lstData,
    wallet,
    walletAddress,
    depositAmount,
    selectedMint,
    connection,
    quoteResponseMeta?.quoteResponse,
    selectedSlippageBps,
    selectedSlippagePercent,
    jupiterApiClient,
    refresh,
    fetchLstState,
  ]);

  return (
    <>
      <div className="relative flex flex-col gap-3 rounded-xl bg-[#1C2023] px-8 py-6 max-w-[480px] w-full">
        <div className="flex flex-row justify-between w-full">
          <Typography className="font-aeonik font-[400] text-lg">Deposit</Typography>
          {connected && selectedMintInfo && (
            <div className="flex flex-row gap-2 items-center">
              <div
                className={`p-2 h-7 gap-2 flex flex-row items-center justify-center border rounded-2xl border-white/10 bg-black/10 cursor-pointer`}
                onClick={() => setIsSettingsModalOpen(true)}
              >
                <SettingsIcon />
                <Typography className={`text-xs text-secondary mt-2px`}>
                  {isNaN(selectedSlippagePercent) ? "0" : selectedSlippagePercent}%
                </Typography>
              </div>
              <div className="leading-5">
                <WalletIcon />
              </div>
              <Typography className="font-aeonik font-[400] text-sm leading-5">
                {selectedMintInfo.balance ? numeralFormatter(selectedMintInfo.balance) : "-"}
              </Typography>
              <a
                className={`font-aeonik font-[700] text-base leading-5 ml-2 cursor-pointer hover:text-[#DCE85D]`}
                onClick={() => setDepositAmount(selectedMintInfo.balance)}
              >
                MAX
              </a>
            </div>
          )}
        </div>

        <NumericFormat
          placeholder="0"
          value={depositAmount}
          allowNegative={false}
          decimalScale={9}
          onValueChange={onChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && connected && depositAmount !== 0 && !loadingQuotes && !swapping) {
              onMint();
            }
          }}
          thousandSeparator=","
          customInput={TextField}
          size="small"
          isAllowed={(values) => {
            const { floatValue } = values;
            if (!connected || selectedMintInfo === null) {
              return true;
            }
            if (selectedMintInfo.balance === 0) {
              return false;
            }
            return floatValue ? floatValue < selectedMintInfo.balance : true;
          }}
          sx={{
            input: { textAlign: "right", MozAppearance: "textfield" },
            "input::-webkit-inner-spin-button": { WebkitAppearance: "none", margin: 0 },
            "& .MuiOutlinedInput-root": {
              "&.Mui-focused fieldset": {
                borderWidth: "0px",
              },
            },
          }}
          className="bg-[#0F1111] p-2 rounded-xl"
          InputProps={
            tokenDataMap
              ? {
                  className: "font-aeonik text-[#e1e1e1] p-0 m-0",
                  startAdornment: (
                    <DropDownButton
                      tokenDataMap={tokenDataMap}
                      selectedMintInfo={
                        selectedMintInfo
                      }
                      setSelectedMint={setSelectedMint}
                    />
                  ),
                }
              : {}
          }
        />

        <div className="flex flex-row justify-between w-full my-auto pt-2">
          <Typography className="font-aeonik font-[400] text-lg">You will receive</Typography>
          <Typography className="font-aeonik font-[700] text-xl text-[#DCE85D]">
            {lstOutAmount !== null && selectedMintInfo ? LST_FORMATTER.format(lstOutAmount) : "-"} $LST
          </Typography>
        </div>
        <div className="py-7">
          <PrimaryButton
            className="h-[36px]"
            disabled={
              connected &&
              (!depositAmount ||
                depositAmount == 0 ||
                lstOutAmount === 0 ||
                lstOutAmount === null ||
                loadingQuotes ||
                swapping)
            }
            onClick={connected ? onMint : openWalletSelector}
          >
            {swapping ? (
              <CircularProgress size={20} thickness={6} sx={{ color: "#DCE85D" }} />
            ) : connected ? (
              "Mint"
            ) : (
              "Connect"
            )}
          </PrimaryButton>
        </div>
        <div className="flex flex-row justify-between w-full my-auto">
          <Typography className="font-aeonik font-[400] text-base">Current price</Typography>
          <Typography className="font-aeonik font-[700] text-lg">
            1 $LST = {lstData ? lstData.lstSolValue : "-"} SOL
          </Typography>
        </div>
        <div className="flex flex-row justify-between w-full my-auto">
          <Typography className="font-aeonik font-[400] text-base">Deposit fee</Typography>
          <Typography className="font-aeonik font-[700] text-lg">0%</Typography>
        </div>
      </div>
      <SettingsModal
        isOpen={isSettingsModalOpen}
        handleClose={() => setIsSettingsModalOpen(false)}
        selectedSlippagePercent={selectedSlippagePercent}
        setSelectedSlippagePercent={setSelectedSlippagePercent}
      />
    </>
  );
};

interface DropDownButtonProps {
  tokenDataMap: TokenDataMap;
  selectedMintInfo: TokenData | null;
  setSelectedMint: Dispatch<SetStateAction<PublicKey>>;
  disabled?: boolean;
}

const DropDownButton: FC<DropDownButtonProps> = ({ tokenDataMap, selectedMintInfo, setSelectedMint, disabled }) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  return (
    <>
      <div
        onClick={() => setIsModalOpen(true)}
        className={`flex flex-row justify-between items-center py-2 px-3 text-white bg-[#303030] rounded-lg ${
          disabled ? "opacity-50" : "cursor-pointer hover:bg-[#2D2D2D]"
        }`}
      >
        <div className="w-[24px] mr-2">
          <Image src={selectedMintInfo?.iconUrl ?? "/info_icon.png"} alt="token logo" height={24} width={24} />
        </div>
        <Typography className="font-aeonik font-[500] text-lg mr-1">{selectedMintInfo?.symbol ?? "SOL"}</Typography>
        <ArrowDropDown sx={{ width: "20px", padding: 0 }} />
      </div>

      <StakingModal
        isOpen={isModalOpen}
        handleClose={() => setIsModalOpen(false)}
        tokenDataMap={tokenDataMap}
        setSelectedMint={setSelectedMint}
      />
    </>
  );
};

async function depositToken(
  stakePoolAddress: PublicKey,
  depositAmount: number,
  mint: PublicKey,
  connection: Connection,
  wallet: Wallet
): Promise<string> {
  const finalIxList = [];
  const finalSignerList = [];

  if (!mint.equals(SOL_MINT)) {
    // Jup swap ix
  }

  const _depositAmount = depositAmount * 1e9;
  console.log("deposit amount", _depositAmount, depositAmount)

  const { instructions, signers } = await solanaStakePool.depositSol(
    connection,
    stakePoolAddress,
    wallet.publicKey,
    _depositAmount,
    undefined
  );

  finalIxList.push(...instructions);
  finalSignerList.push(...signers);

  const tx = new Transaction().add(...finalIxList);

  const sig = await processTransaction(connection, wallet, tx, finalSignerList, { dryRun: false });

  console.log(`Staked ${depositAmount} ${shortenAddress(mint)} with signature ${sig}`);

  return sig;
}

export function makeTokenAmountFormatter(decimals: number) {
  return new Intl.NumberFormat("en-US", {
    useGrouping: true,
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}
