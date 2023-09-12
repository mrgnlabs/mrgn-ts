import { Dispatch, FC, SetStateAction, use, useCallback, useEffect, useMemo, useState } from "react";
import { TextField, Typography } from "@mui/material";
import * as solanaStakePool from "@solana/spl-stake-pool";
import { WalletIcon } from "./WalletIcon";
import { PrimaryButton } from "./PrimaryButton";
import { useLstStore } from "~/pages/stake";
import { useWalletContext } from "~/components/useWalletContext";
import { Wallet, numeralFormatter, processTransaction } from "@mrgnlabs/mrgn-common";
import { ArrowDropDown } from "@mui/icons-material";
import { StakingModal } from "./StakingModal";
import Image from "next/image";
import { NumberFormatValues, NumericFormat } from "react-number-format";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";
import { useJupiter } from "@jup-ag/react-hook";
import { TokenListProvider, TokenInfo } from "@solana/spl-token-registry";
import { useJupiterStore } from "~/store";
import { QuoteResponse, createJupiterApiClient } from "@jup-ag/api";

import JSBI from "jsbi";

type SupportedToken = "SOL";

const TOKEN_URL_MAP: Record<SupportedToken, string> = {
  SOL: "info_icon.png",
};

const SUPPORTED_TOKENS = [
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
  // continue the list as you please
];

export const StakingCard: FC = () => {
  const { connection } = useConnection();
  const { connected, wallet } = useWalletContext();
  const [lstData, userData] = useLstStore((state) => [state.lstData, state.userData]);
  const jupiterQuoteApi = createJupiterApiClient();

  // tokenMap are mints and icons & tokenAccountMap contains your token accounts mapped to their mint
  const [tokenMap, tokenAccountMap] = useJupiterStore((state) => [state.tokenMap, state.tokenAccountMap]);

  const [quoteMap, setQuoteMap] = useState<Map<string, QuoteResponse>>(new Map());
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [selectedToken, setSelectedToken] = useState<SupportedToken>("SOL");

  const maxDeposit = useMemo(() => userData?.availableSolBalance ?? 0, [userData]);

  const calculateRoutes = async () => {
    // calculates the routes
    if (depositAmount) {
      for (let token of SUPPORTED_TOKENS) {
        const result = await jupiterQuoteApi.quoteGet({
          inputMint: token,
          outputMint: "So11111111111111111111111111111111111111112",
          amount: depositAmount,
        });
        setQuoteMap(quoteMap.set(token, result));
      }
    }
  };

  const onChange = useCallback(
    (event: NumberFormatValues) => setDepositAmount(event.floatValue ?? 0),
    [setDepositAmount]
  );

  const onMint = useCallback(async () => {
    if (!lstData || !wallet) return;
    console.log("depositing", depositAmount, selectedToken);
    try {
      await depositSol(lstData.poolAddress, depositAmount, selectedToken, connection, wallet);
    } finally {
      setDepositAmount(0);
    }
  }, [connection, depositAmount, lstData, selectedToken, wallet]);

  return (
    <>
      <div className="relative flex flex-col gap-3 rounded-xl bg-[#1C2023] px-8 py-6 max-w-[480px] w-full">
        <div className="flex flex-row justify-between w-full">
          <Typography className="font-aeonik font-[400] text-lg">Deposit</Typography>
          {connected && (
            <div className="flex flex-row gap-2">
              <div className="leading-5">
                <WalletIcon />
              </div>
              <Typography className="font-aeonik font-[400] text-sm leading-5">
                {userData ? `${numeralFormatter(userData.availableSolBalance)} SOL` : "-"}
              </Typography>
              <a
                className={`font-aeonik font-[700] text-base leading-5 ${
                  !maxDeposit ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                }`}
                onClick={() => setDepositAmount(maxDeposit)}
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
          disabled={!connected || !maxDeposit}
          onValueChange={onChange}
          thousandSeparator=","
          customInput={TextField}
          size="small"
          isAllowed={(values) => {
            const { floatValue } = values;
            if (!maxDeposit) return false;
            return floatValue ? floatValue < maxDeposit : true;
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
          className="text-white bg-[#0F1111] text-3xl p-2 rounded-xl"
          InputProps={{
            className: "font-aeonik text-[#e1e1e1] text-2xl p-0 m-0",
            disabled: !connected || !maxDeposit,
            startAdornment: (
              <DropDownButton
                depositAmount={depositAmount}
                setDepositAmount={setDepositAmount}
                selectedToken={selectedToken}
                setSelectedToken={setSelectedToken}
                disabled={!connected || !maxDeposit}
              />
            ),
          }}
        />

        <div className="flex flex-row justify-between w-full my-auto pt-2">
          <Typography className="font-aeonik font-[400] text-lg">You will receive</Typography>
          <Typography className="font-aeonik font-[700] text-2xl text-[#75BA80]">
            {lstData ? numeralFormatter(depositAmount / lstData.lstSolValue) : "-"} $LST
          </Typography>
        </div>
        <div className="py-7">
          <PrimaryButton disabled={!maxDeposit || depositAmount == 0} onClick={onMint}>
            Mint
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
  depositAmount: number;
  setDepositAmount: Dispatch<SetStateAction<number>>;
  selectedToken: SupportedToken;
  setSelectedToken: Dispatch<SetStateAction<SupportedToken>>;
  disabled: boolean;
}

const DropDownButton: FC<DropDownButtonProps> = ({ selectedToken, disabled }) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  return (
    <>
      <div
        onClick={() => setIsModalOpen(true)}
        className={`w-[250px] h-[45px] flex flex-row justify-between py-2 px-4 text-white bg-[#303030] rounded-lg ${
          disabled ? "opacity-50" : "cursor-pointer"
        }`}
      >
        <div className="flex flex-row gap-3">
          <div className="m-auto">
            <Image src={`/${TOKEN_URL_MAP[selectedToken]!}`} alt="token logo" height={24} width={24} />
          </div>
          <Typography className="font-aeonik font-[700] text-lg leading-none my-auto">{selectedToken}</Typography>
        </div>
        <ArrowDropDown />
      </div>
      <StakingModal isOpen={isModalOpen} handleClose={() => setIsModalOpen(false)} />
    </>
  );
};

async function depositSol(
  stakePoolAddress: PublicKey,
  depositAmount: number,
  token: SupportedToken,
  connection: Connection,
  wallet: Wallet
) {
  if (token !== "SOL") throw new Error("Only SOL is supported for now");
  console.log("1 depositing", depositAmount, token);
  const _depositAmount = depositAmount * 1e9;
  console.log("2 depositing", _depositAmount, token);

  const { instructions, signers } = await solanaStakePool.depositSol(
    connection,
    stakePoolAddress,
    wallet.publicKey,
    _depositAmount,
    undefined
  );

  const tx = new Transaction().add(...instructions);

  const sig = await processTransaction(connection, wallet, tx, signers, { dryRun: false });

  console.log(`Staked ${depositAmount} ${token} with signature ${sig}`);
}
