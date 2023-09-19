import { Dispatch, FC, SetStateAction, useCallback, useEffect, useMemo, useState } from "react";
import { TextField, Typography, CircularProgress } from "@mui/material";
import * as solanaStakePool from "@solana/spl-stake-pool";
import { WalletIcon } from "./WalletIcon";
import { PrimaryButton } from "./PrimaryButton";
import { useLstStore } from "~/pages/stake";
import { useWalletContext } from "~/components/useWalletContext";
import {
  ACCOUNT_SIZE,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  createInitializeAccountInstruction,
  getAssociatedTokenAddressSync,
  numeralFormatter,
  percentFormatter,
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
  SYSVAR_RENT_PUBKEY,
  Signer,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";
import { SwapMode, useJupiter } from "@jup-ag/react-hook";
import JSBI from "jsbi";
import { usePrevious } from "~/utils";
import { createJupiterApiClient, instanceOfSwapInstructionsResponse, Instruction } from "@jup-ag/api";
import { toast } from "react-toastify";
import { SettingsModal } from "./SettingsModal";
import { SettingsIcon } from "./SettingsIcon";
import { SOL_MINT, TokenData, TokenDataMap } from "~/store/lstStore";
import { RefreshIcon } from "./RefreshIcon";
import { StakePoolProxyProgram } from "~/utils/stakePoolProxy";

const QUOTE_EXPIRY_MS = 30_000;

export const StakingCard: FC = () => {
  const { connection } = useConnection();
  const { connected, wallet, walletAddress, openWalletSelector } = useWalletContext();
  const [lstData, tokenDataMap, fetchLstState, slippagePct, setSlippagePct, stakePoolProxyProgram] = useLstStore(
    (state) => [
      state.lstData,
      state.tokenDataMap,
      state.fetchLstState,
      state.slippagePct,
      state.setSlippagePct,
      state.stakePoolProxyProgram,
    ]
  );

  const jupiterApiClient = createJupiterApiClient();

  const [swapping, setSwapping] = useState<boolean>(false);
  const [refreshingQuotes, setRefreshingQuotes] = useState<boolean>(false);
  const [depositAmount, setDepositAmount] = useState<number | null>(null);
  const [selectedMint, setSelectedMint] = useState<PublicKey>(SOL_MINT);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  const { slippage, slippageBps } = useMemo(
    () => ({ slippage: slippagePct / 100, slippageBps: slippagePct * 100 }),
    [slippagePct]
  );

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
    lastRefreshTimestamp,
  } = useJupiter({
    amount: selectedMint.equals(SOL_MINT) ? JSBI.BigInt(0) : JSBI.BigInt(rawDepositAmount), // amountIn trick to avoid SOL -> SOL quote calls
    inputMint: selectedMint,
    outputMint: SOL_MINT,
    swapMode: SwapMode.ExactIn,
    slippageBps,
    debounceTime: 250, // debounce ms time before consecutive refresh calls
  });

  const priceImpactPct: number | null = useMemo(() => {
    if (!quoteResponseMeta?.quoteResponse) return null;
    return Number(quoteResponseMeta.quoteResponse.priceImpactPct);
  }, [quoteResponseMeta?.quoteResponse]);

  const refreshQuoteIfNeeded = useCallback(
    (force: boolean = false) => {
      const hasExpired = Date.now() - lastRefreshTimestamp > QUOTE_EXPIRY_MS;
      if (!selectedMint.equals(SOL_MINT) && (depositAmount ?? 0 > 0) && (hasExpired || force)) {
        setRefreshingQuotes(true);
        refresh();
      }
    },
    [selectedMint, depositAmount, refresh, lastRefreshTimestamp]
  );

  useEffect(() => {
    refreshQuoteIfNeeded();
    const id = setInterval(refreshQuoteIfNeeded, 1_000);
    return () => clearInterval(id);
  }, [refreshQuoteIfNeeded]);

  useEffect(() => {
    if (!loadingQuotes) {
      setTimeout(() => setRefreshingQuotes(false), 500);
    }
  }, [loadingQuotes]);

  const lstOutAmount: number | null = useMemo(() => {
    if (depositAmount === null) return null;
    if (!selectedMint || !lstData?.lstSolValue) return 0;

    if (selectedMint.equals(SOL_MINT)) {
      return depositAmount / lstData.lstSolValue;
    } else {
      if (quoteResponseMeta?.quoteResponse?.outAmount) {
        const outAmount = JSBI.toNumber(quoteResponseMeta?.quoteResponse?.outAmount) / 1e9;
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
    if (!lstData || !wallet || !walletAddress || !depositAmount || !stakePoolProxyProgram) return;
    console.log("depositing", depositAmount, selectedMint);

    let sigs = [];

    setSwapping(true);

    const {
      value: { blockhash, lastValidBlockHeight },
    } = await connection.getLatestBlockhashAndContext();

    try {
      if (selectedMint.equals(SOL_MINT)) {
        const _depositAmount = depositAmount * 1e9;

        const { instructions, signers } = await makeDepositSolToStakePoolIx(
          lstData.accountData,
          lstData.poolAddress,
          walletAddress,
          _depositAmount,
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

        sigs.push(depositSig);
      } else {
        const quote = quoteResponseMeta?.original;
        if (!quote) {
          throw new Error("Route not calculated yet");
        }

        const destinationTokenAccountKeypair = Keypair.generate();

        const minimumRentExemptionForTokenAccount = await connection.getMinimumBalanceForRentExemption(ACCOUNT_SIZE);
        const createWSolAccountIx = SystemProgram.createAccount({
          fromPubkey: walletAddress,
          newAccountPubkey: destinationTokenAccountKeypair.publicKey,
          lamports: minimumRentExemptionForTokenAccount,
          space: ACCOUNT_SIZE,
          programId: TOKEN_PROGRAM_ID,
        });
        const initWSolAccountIx = createInitializeAccountInstruction(
          destinationTokenAccountKeypair.publicKey,
          SOL_MINT,
          walletAddress
        );

        // Craft swap tx
        const swapInstructionsResult = await jupiterApiClient.swapInstructionsPost({
          swapRequest: {
            quoteResponse: quote,
            userPublicKey: walletAddress.toBase58(),
            wrapAndUnwrapSol: false,
            destinationTokenAccount: destinationTokenAccountKeypair.publicKey.toBase58(),
          },
        });
        if (!instanceOfSwapInstructionsResponse(swapInstructionsResult)) throw new Error("Invalid swap response");

        const addressLookupTableAccounts: AddressLookupTableAccount[] = [];

        const swapInstructions = [
          ...swapInstructionsResult.computeBudgetInstructions.map(jupIxToSolanaIx),
          createWSolAccountIx,
          initWSolAccountIx,
          ...swapInstructionsResult.setupInstructions.map(jupIxToSolanaIx),
          jupIxToSolanaIx(swapInstructionsResult.swapInstruction),
        ];
        if (swapInstructionsResult.cleanupInstruction) {
          swapInstructions.push(jupIxToSolanaIx(swapInstructionsResult.cleanupInstruction));
        }

        addressLookupTableAccounts.push(
          ...(await getAdressLookupTableAccounts(connection, swapInstructionsResult.addressLookupTableAddresses))
        );

        const swapTransactionMessage = new TransactionMessage({
          instructions: swapInstructions,
          payerKey: walletAddress,
          recentBlockhash: blockhash,
        }).compileToV0Message(addressLookupTableAccounts);
        const swapTransaction = new VersionedTransaction(swapTransactionMessage);
        swapTransaction.sign([destinationTokenAccountKeypair]);
        console.log(swapTransaction.serialize().length)
        
        // Craft stake pool deposit tx
        const { instructions, signers } = await makeDepositWSolToStakePoolIx(
          lstData.accountData,
          lstData.poolAddress,
          wallet.publicKey,
          destinationTokenAccountKeypair.publicKey,
          stakePoolProxyProgram,
          minimumRentExemptionForTokenAccount
        );
        const depositMessage = new TransactionMessage({
          instructions: instructions,
          payerKey: walletAddress,
          recentBlockhash: blockhash,
        });
        const depositTransaction = new VersionedTransaction(depositMessage.compileToV0Message([]));
        depositTransaction.sign(signers);

        // Send txs
        const signedSwapTransaction = await wallet.signTransaction(swapTransaction);
        const swapSig = await connection.sendTransaction(signedSwapTransaction);
        await connection.confirmTransaction(
          {
            blockhash,
            lastValidBlockHeight,
            signature: swapSig,
          },
          "confirmed"
        ); // TODO: explicitly warn if second tx fails
        
        const signedDepositTransaction = await wallet.signTransaction(depositTransaction);
        const depositSig = await connection.sendTransaction(signedDepositTransaction);
        await connection.confirmTransaction(
          {
            blockhash,
            lastValidBlockHeight,
            signature: depositSig,
          },
          "confirmed"
        );
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
      setDepositAmount(0);
      setSwapping(false);
    }
  }, [
    lstData,
    wallet,
    walletAddress,
    depositAmount,
    stakePoolProxyProgram,
    selectedMint,
    connection,
    quoteResponseMeta?.original,
    jupiterApiClient,
    refresh,
    fetchLstState,
  ]);

  return (
    <>
      <div className="relative flex flex-col gap-3 rounded-xl bg-[#1C2023] px-6 sm:px-8 py-4 sm:py-6 max-w-[480px] w-full">
        <div className="flex flex-row justify-between w-full">
          <div className="flex flex-row items-center gap-4">
            <Typography className="font-aeonik font-[400] text-lg">Deposit</Typography>
            {selectedMintInfo && (
              <div className="flex flex-row gap-2 items-center">
                {selectedMintInfo.symbol !== "SOL" && (
                  <>
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
                  </>
                )}
              </div>
            )}
          </div>

          {connected && selectedMintInfo && (
            <div className="flex flex-row items-center gap-1">
              <div className="leading-5">
                <WalletIcon />
              </div>
              <Typography className="font-aeonik font-[400] text-sm leading-5">
                {selectedMintInfo.balance
                  ? selectedMintInfo.balance < 0.01
                    ? "< 0.01"
                    : numeralFormatter(selectedMintInfo.balance)
                  : "-"}
              </Typography>
              <a
                className={`p-2 h-7 flex flex-row items-center justify-center text-sm border rounded-full border-white/10 bg-black/10 text-secondary fill-current cursor-pointer hover:bg-black/20 hover:border-[#DCE85D]/70 hover:shadow-[#DCE85D]/70 transition-all duration-200 ease-in-out`}
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
            if (e.key === "Enter" && connected && depositAmount !== 0 && !refreshingQuotes && !swapping) {
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
                      selectedMintInfo={selectedMintInfo}
                      setSelectedMint={setSelectedMint}
                    />
                  ),
                }
              : {}
          }
        />

        <div className="flex flex-row justify-between w-full my-auto pt-2">
          <Typography className="font-aeonik font-[400] text-lg">You will receive</Typography>
          <Typography className="font-aeonik font-[700] text-lg sm:text-xl text-[#DCE85D]">
            {lstOutAmount !== null && selectedMintInfo
              ? lstOutAmount < 0.01 && lstOutAmount > 0
                ? "< 0.01"
                : numeralFormatter(lstOutAmount)
              : "-"}{" "}
            $LST
          </Typography>
        </div>
        <div className="py-5">
          <PrimaryButton
            className="h-[36px]"
            disabled={
              connected &&
              (!depositAmount ||
                depositAmount == 0 ||
                lstOutAmount === 0 ||
                lstOutAmount === null ||
                refreshingQuotes ||
                swapping)
            }
            onClick={connected ? onMint : openWalletSelector}
          >
            {connected && (swapping || refreshingQuotes) ? (
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
            1 $LST = {lstData ? makeTokenAmountFormatter(3).format(lstData.lstSolValue) : "-"} SOL
          </Typography>
        </div>
        <div className="flex flex-row justify-between w-full my-auto">
          <Typography className="font-aeonik font-[400] text-base">Deposit fee</Typography>
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
  lamports: number,
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
      lamports,
    })
  );

  // Create token account if not specified
  if (!destinationTokenAccount) {
    const associatedAddress = getAssociatedTokenAddressSync(stakePool.poolMint, from);
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
      lamports,
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
 * Creates instructions required to deposit the whole balance of a wsol account to stake pool.
 */
async function makeDepositWSolToStakePoolIx(
  stakePool: solanaStakePool.StakePool,
  stakePoolAddress: PublicKey,
  from: PublicKey,
  sourceSolTokenAccount: PublicKey,
  stakePoolProxyProgram: StakePoolProxyProgram,
  minimumRentExemptionForTokenAccount: number
) {
  // Ephemeral SOL account just to receive the wSOL conversion
  const userSolTransfer = new Keypair();
  const signers: Signer[] = [userSolTransfer];
  const instructions: TransactionInstruction[] = [];

  // Create the ephemeral SOL account
  instructions.push(createCloseAccountInstruction(sourceSolTokenAccount, userSolTransfer.publicKey, from));
  instructions.push(
    SystemProgram.transfer({
      fromPubkey: userSolTransfer.publicKey,
      toPubkey: from,
      lamports: minimumRentExemptionForTokenAccount,
    })
  );
  // Create token account
  const associatedAddress = getAssociatedTokenAddressSync(stakePool.poolMint, from);
  instructions.push(
    createAssociatedTokenAccountIdempotentInstruction(from, associatedAddress, from, stakePool.poolMint)
  );
  const destinationLstTokenAccount = associatedAddress;

  const withdrawAuthority = findWithdrawAuthorityProgramAddress(
    solanaStakePool.STAKE_POOL_PROGRAM_ID,
    stakePoolAddress
  );
  instructions.push(
    await stakePoolProxyProgram.methods
      .depositAllSol()
      .accountsStrict({
        stakePool: stakePoolAddress,
        reserveStakeAccount: stakePool.reserveStake,
        lamportsFrom: userSolTransfer.publicKey,
        poolTokensTo: destinationLstTokenAccount,
        managerFeeAccount: stakePool.managerFeeAccount,
        referrerPoolTokensAccount: destinationLstTokenAccount,
        poolMint: stakePool.poolMint,
        stakePoolWithdrawAuthority: withdrawAuthority,
        stakePoolProgram: solanaStakePool.STAKE_POOL_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction()
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

function jupIxToSolanaIx(ix: Instruction): TransactionInstruction {
  return new TransactionInstruction({
    programId: new PublicKey(ix.programId),
    keys: ix.accounts.map((acc) => {
      return {
        pubkey: new PublicKey(acc.pubkey),
        isSigner: acc.isSigner,
        isWritable: acc.isWritable,
      };
    }),
    data: Buffer.from(ix.data, "base64"),
  });
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
