import { Dispatch, FC, SetStateAction, useCallback, useEffect, useMemo, useState } from "react";
import { TextField, Typography } from "@mui/material";
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
import { SwapMode, useJupiter, useJupiterExchange } from "@jup-ag/react-hook";
import JSBI from "jsbi";
import { usePrevious } from "~/utils";
import { SwapResponse, createJupiterApiClient, instanceOfSwapResponse } from "@jup-ag/api";
import { SUPPORTED_TOKENS } from "~/store/lstStore";

const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
const SLIPPAGE_BPS = 5;

export interface TokenData {
  mint: PublicKey;
  symbol: string;
  decimals: number;
  iconUrl: string;
  balance: number;
}

export const StakingCard: FC = () => {
  const { connection } = useConnection();
  const { connected, wallet, walletAddress, openWalletSelector } = useWalletContext();
  const [lstData, userData, jupiterTokenInfo, userTokenAccounts] = useLstStore((state) => [
    state.lstData,
    state.userData,
    state.jupiterTokenInfo,
    state.userTokenAccounts,
  ]);
  const jupiterApiClient = createJupiterApiClient();

  const [depositAmount, setDepositAmount] = useState<number>(0);

  const [selectedMint, setSelectedMint] = useState<PublicKey>(SOL_MINT);

  const prevWalletAddress = usePrevious(walletAddress);
  useEffect(() => {
    if ((!walletAddress && prevWalletAddress) || (walletAddress && !prevWalletAddress)) {
      setDepositAmount(0);
      setSelectedMint(SOL_MINT);
    }
  }, [walletAddress, prevWalletAddress]);

  // const maxDeposit: number | null = useMemo(() => userData?.nativeSolBalance ?? null, [userData]);

  const supportedTokensForUser: TokenData[] = useMemo(() => {
    if (!userData || !userTokenAccounts || !userData?.nativeSolBalance) return [];

    const ownedMints = SUPPORTED_TOKENS.filter(
      (mint) => userTokenAccounts.has(mint) || new PublicKey(mint).equals(SOL_MINT)
    );
    return ownedMints.map((key) => {
      const mint = new PublicKey(key);

      const tokenInfo = jupiterTokenInfo.get(mint.toString());
      if (!tokenInfo) throw new Error(`Token ${mint.toBase58()} not found`);

      let walletBalance: number;
      if (mint.equals(SOL_MINT)) {
        walletBalance = userData.nativeSolBalance;
      } else {
        const tokenAccount = userTokenAccounts.get(mint.toBase58());
        walletBalance = tokenAccount.balance;
      }

      return {
        mint,
        symbol: tokenInfo.symbol,
        iconUrl: tokenInfo.logoURI ?? "/info_icon.png",
        decimals: tokenInfo.decimals,
        balance: walletBalance,
      };
    });
  }, [userData, userTokenAccounts, jupiterTokenInfo]);

  const selectedMintInfo: TokenData | undefined = useMemo(
    () => supportedTokensForUser.find((token) => token.mint.equals(selectedMint)),
    [supportedTokensForUser, selectedMint]
  );

  const rawDepositAmount = useMemo(
    () => Math.trunc(Math.pow(10, selectedMintInfo?.decimals ?? 0) * depositAmount),
    [depositAmount, selectedMintInfo]
  );

  const {
    quoteResponseMeta,
    allTokenMints,
    routeMap,
    exchange,
    loading: loadingQuotes,
    refresh,
    lastRefreshTimestamp,
    error,
  } = useJupiter({
    amount: JSBI.BigInt(rawDepositAmount), // raw input amount of tokens
    inputMint: selectedMint,
    outputMint: SOL_MINT,
    swapMode: SwapMode.ExactIn,
    slippageBps: SLIPPAGE_BPS, // 0.5% slippage
    debounceTime: 250, // debounce ms time before refresh
  });

  const lstOutAmount = useMemo(() => {
    if (!connected) return "-";
    if (!selectedMint || !lstData?.lstSolValue) return 0;

    if (selectedMint.equals(SOL_MINT)) {
      return numeralFormatter(depositAmount / lstData.lstSolValue);
    } else {
      if (quoteResponseMeta?.quoteResponse?.outAmount) {
        const outAmount = JSBI.toNumber(quoteResponseMeta?.quoteResponse?.outAmount) / Math.pow(10, 9); // adding decimals for SOL
        return numeralFormatter(outAmount / lstData.lstSolValue);
      } else {
        return 0;
      }
    }
  }, [depositAmount, selectedMint, lstData, quoteResponseMeta]);

  const onChange = useCallback(
    (event: NumberFormatValues) => setDepositAmount(event.floatValue ?? 0),
    [setDepositAmount]
  );

  const onMint = useCallback(async () => {
    if (!lstData || !wallet || !depositAmount) return;
    console.log("depositing", depositAmount, selectedMint);

    try {
      if (selectedMint.equals(SOL_MINT)) {
        await depositToken(lstData.poolAddress, depositAmount, selectedMint, connection, wallet);
      } else {
        if (!quoteResponseMeta?.quoteResponse) {
          throw new Error("Route not calculated yet");
        }
        const outAmount = JSBI.toNumber(quoteResponseMeta.quoteResponse.outAmount);
        const finalAmount = Math.floor(outAmount - outAmount * 0.005);

        const avoidSlippageIssues = await jupiterApiClient.quoteGet({
          amount: finalAmount, // add slippage
          inputMint: selectedMint.toBase58(),
          outputMint: SOL_MINT.toBase58(),
          swapMode: SwapMode.ExactOut,
          slippageBps: 5, // 0.5% slippage
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

          const {
            value: { blockhash },
          } = await connection.getLatestBlockhashAndContext();

          const depositMessage = new TransactionMessage({
            instructions: instructions,
            payerKey: walletAddress,
            recentBlockhash: blockhash,
          });

          const depositTransaction = new VersionedTransaction(depositMessage.compileToV0Message([]));
          depositTransaction.sign(signers);

          const versionedTransactions = await wallet.signAllTransactions([swapTransaction, depositTransaction]);

          const signature = await connection.sendTransaction(versionedTransactions[0]); //TODO confirm
          const signature2 = await connection.sendTransaction(versionedTransactions[1]); //TODO confirm
        }
      }
    } catch (error: any) {
      if (error.logs) {
        console.log("------ Logs 👇 ------");
        console.log(error.logs.join("\n"));
      }

      throw `Transaction failed! ${error?.message}`;
    } finally {
      setDepositAmount(0);
      refresh();
    }
  }, [connection, quoteResponseMeta, depositAmount, lstData, selectedMint, wallet]);

  return (
    <>
      <div className="relative flex flex-col gap-3 rounded-xl bg-[#1C2023] px-8 py-6 max-w-[480px] w-full">
        <div className="flex flex-row justify-between w-full">
          <Typography className="font-aeonik font-[400] text-lg">Deposit</Typography>
          {connected && selectedMintInfo && (
            <div className="flex flex-row gap-2 items-center">
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
          thousandSeparator=","
          customInput={TextField}
          size="small"
          isAllowed={(values) => {
            const { floatValue } = values;
            if (selectedMintInfo?.balance === null) return true;
            if (selectedMintInfo?.balance === 0) return false;
            return floatValue ? floatValue <= selectedMintInfo?.balance : true;
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
            jupiterTokenInfo
              ? {
                  className: "font-aeonik text-[#e1e1e1] p-0 m-0",
                  startAdornment: (
                    <DropDownButton
                      supportedTokens={supportedTokensForUser}
                      selectedMintInfo={
                        selectedMintInfo ?? {
                          mint: SOL_MINT,
                          iconUrl: "/info_icon.png",
                          symbol: "SOL",
                        }
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
          <Typography className="font-aeonik font-[700] text-xl text-[#DCE85D]">{lstOutAmount} $LST</Typography>
        </div>
        <div className="py-7">
          <PrimaryButton
            disabled={!connected || depositAmount === 0 || loadingQuotes}
            onClick={connected ? onMint : openWalletSelector}
          >
            {connected ? "Mint" : "Connect"}
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
    </>
  );
};

interface DropDownButtonProps {
  supportedTokens: TokenData[];
  selectedMintInfo: { mint: PublicKey; symbol: string; iconUrl: string };
  setSelectedMint: Dispatch<SetStateAction<PublicKey>>;
  disabled?: boolean;
}

const DropDownButton: FC<DropDownButtonProps> = ({ supportedTokens, selectedMintInfo, setSelectedMint, disabled }) => {
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
          <Image src={selectedMintInfo.iconUrl} alt="token logo" height={24} width={24} />
        </div>
        <Typography className="font-aeonik font-[500] text-lg mr-1">{selectedMintInfo.symbol}</Typography>
        <ArrowDropDown sx={{ width: "20px", padding: 0 }} />
      </div>

      <StakingModal
        isOpen={isModalOpen}
        handleClose={() => setIsModalOpen(false)}
        supportedTokens={supportedTokens}
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
) {
  const finalIxList = [];
  const finalSignerList = [];

  if (!mint.equals(SOL_MINT)) {
    // Jup swap ix
  }

  console.log("1 depositing", depositAmount, mint);
  const _depositAmount = depositAmount * 1e9;
  console.log("2 depositing", _depositAmount, mint);

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
}
