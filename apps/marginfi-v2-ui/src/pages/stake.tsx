import React, { FC, MouseEventHandler, ReactNode, useCallback, useMemo, useState, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PageHeader } from "~/components/PageHeader";
import { Button, ButtonProps, InputAdornment, TextField, Skeleton } from "@mui/material";
import { NumberFormatValues, NumericFormat } from "react-number-format";
import dynamic from "next/dynamic";
import Image from "next/image";
import { PublicKey, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import styles from "~/components/AccountSummary/style.module.css";
import { Typography } from "@mui/material";
import { numeralFormatter } from "~/utils/formatters";
import { depositSol, stakePoolInfo } from '@solana/spl-stake-pool';
import { useProgram } from '~/context';

const LST_POOL = new PublicKey("ADD");

const WalletMultiButtonDynamic = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

interface ProActionProps extends ButtonProps {
  children: ReactNode;
}

export const ProAction: FC<ProActionProps> = ({ children, disabled, ...otherProps }) => {
  const wallet = useWallet();

  return wallet.connected ? (
    <Button
      className={`bg-white text-black normal-case text-sm min-w-[360px] w-[360px] h-12 rounded-[100px] ${
        disabled && "cursor-not-allowed"
      }`}
      style={{
        backgroundColor: disabled || !wallet.connected ? "gray" : "rgb(227, 227, 227)",
        color: "black",
        fontFamily: "Aeonik Pro",
        zIndex: 10,
      }}
      {...otherProps}
      disabled={disabled || !wallet.connected}
    >
      {children}
    </Button>
  ) : (
    <WalletMultiButtonDynamic
      className="bg-white text-black normal-case text-sm min-w-[360px] w-[360px] h-12 rounded-[100px] flex justify-center items-center"
      startIcon={undefined}
    >
      Connect
    </WalletMultiButtonDynamic>
  );
};

interface ProInputBox {
  value: number;
  setValue: (value: number) => void;
  loadingSafetyCheck: () => void;
  maxValue?: number;
  maxDecimals?: number;
  disabled?: boolean;
}

export const ProInputBox: FC<ProInputBox> = ({
  value,
  setValue,
  loadingSafetyCheck,
  maxValue,
  maxDecimals,
  disabled,
}) => {
  const onChange = useCallback(
    (event: NumberFormatValues) => {
      const updatedAmountStr = event.value;
      if (updatedAmountStr !== "" && !/^\d*\.?\d*$/.test(updatedAmountStr)) return;

      const updatedAmount = Number(updatedAmountStr);
      if (maxValue !== undefined && updatedAmount > maxValue) {
        loadingSafetyCheck();
        setValue(maxValue);
        return;
      }

      loadingSafetyCheck();
      setValue(updatedAmount);
    },
    [maxValue, setValue, loadingSafetyCheck]
  );

  return (
    // TODO: re-rendering after initial amount capping is messed up and lets anything you type through
    <NumericFormat
      value={value}
      placeholder="0"
      allowNegative={false}
      decimalScale={maxDecimals}
      disabled={disabled}
      onValueChange={onChange}
      thousandSeparator=","
      customInput={TextField}
      size="small"
      max={maxValue}
      InputProps={{
        // @todo width is hacky here
        className:
          "font-aeonik min-w-[360px] h-12 px-0 bg-[#1C2125] text-[#e1e1e1] text-sm font-light rounded-lg self-center",
        endAdornment: (
          <MaxInputAdornment
            onClick={() => {
              if (maxValue !== undefined) {
                setValue(maxValue);
              }
            }}
          />
        ),
      }}
    />
  );
};

export const MaxInputAdornment: FC<{
  onClick: MouseEventHandler<HTMLDivElement>;
  disabled?: boolean;
}> = ({ onClick, disabled }) => (
  <InputAdornment position="end" classes={{ root: "max-w-[40px] h-full" }}>
    <div
      className={`font-aeonik p-0 pr-4 text-[#868E95] text-sm lowercase h-9 font-light flex justify-center items-center hover:bg-transparent ${
        disabled ? "cursor-default" : "cursor-pointer"
      }`}
      onClick={onClick}
    >
      max
    </div>
  </InputAdornment>
);

const Pro = () => {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [amount, setAmount] = useState(0);
  const [stakeTVL, setStakeTVL] = useState<number>(0);
  const { mfiClient } = useProgram();

  // @TODO: Update more frequently than just on load?
  useEffect(() => {
    const fetchTVL = async () => {
      let { details } = await stakePoolInfo(
        connection,
        LST_POOL
      )

      setStakeTVL(
        details.totalLamports.toNumber() * LAMPORTS_PER_SOL
      )
    };

    fetchTVL();
  }, [connection]);

  const maxDepositAmount = useMemo(() => 1, []);

  const depositAction = async (pubkey: PublicKey) => {
    if ((!wallet) || !(mfiClient)) return;
    
    const depositTx = await depositSol(
      connection,
      LST_POOL,
      pubkey,
      0.1 * LAMPORTS_PER_SOL,
    );

    //@ts-ignore
    const tx = await wallet.signTransaction(depositTx);

    mfiClient.processTransaction(tx, depositTx.signers)
  }

  return (
    <>
      <PageHeader text="stake" />
      <div className="h-full rounded-xl font-[500] p-[72px] sm:p-[48px]">
        
        <div className="flex flex-col gap-4">
        <div className="text-[#D9D9D9] text-5xl font-[500] text-center w-full flex justify-center gap-2">
          <Image src="/lst_logo.png" alt="lst" height={48} width={48}/>
          $LST
        </div>
        <div className="text-[#fff] text-xl text-center">
          <span className="text-[#DCE85D]">It's in the name.</span>
        </div>
        </div>

        <div className="w-full pl-2">
        <div className={styles["hide-scrollbar"]}>
          <div className="flex gap-4 w-full min-w-1/2 mt-[20px]">

            <div className="h-full w-1/4">
              <Typography color="#868E95" className="font-aeonik font-[300] text-xs flex gap-1" gutterBottom>
                APY
              </Typography>
              <Typography color="#fff" className="font-aeonik font-[500] text-lg md:text-xl">
                8%
              </Typography>
            </div>
            <DividerLine />

            <div className="h-full w-1/4">
              <Typography color="#868E95" className="font-aeonik font-[300] text-xs flex gap-1" gutterBottom>
                TVL
              </Typography>
              <Typography color="#fff" className="font-aeonik font-[500] text-lg md:text-xl">
                {/* TODO: FIX THE WIDTH WHEN IT'S NOT LOADED? */}
                {/* TODO: PRICE IN USD */}
                {stakeTVL > 0 ? (
                  `$${numeralFormatter(stakeTVL)}`
                ) : (
                  <Skeleton variant="rectangular" animation="wave" className="w-1/3 rounded-md top-[4px]" />
                )}
              </Typography>
            </div>
            <DividerLine />

            <div className="h-full w-1/4">
              <Typography color="#868E95" className="font-aeonik font-[300] text-xs flex gap-1" gutterBottom>
                FEES
              </Typography>
              <Typography color="#fff" className="font-aeonik font-[500] text-lg md:text-xl">
                0%
              </Typography>
            </div>
            <DividerLine />

            <div className="h-full w-1/4">
              <Typography color="#868E95" className="font-aeonik font-[300] text-xs flex gap-1" gutterBottom>
                POINTS
              </Typography>
              <Typography color="#fff" className="font-aeonik font-[500] text-lg md:text-xl">
                100M
              </Typography>
            </div>
          </div>
        </div>
        </div>

        <div className="flex justify-center mt-4">
          <ProInputBox
            value={amount}
            setValue={setAmount}
            maxValue={maxDepositAmount}
            loadingSafetyCheck={() => true}
            maxDecimals={2}
            disabled={!wallet.connected}
          />
        </div>

        <div className="flex justify-center mt-4">
          <ProAction onClick={depositAction}>
            Mint
          </ProAction>
        </div>
      </div>
    </>
  );
};

const DividerLine = () => <div className={styles['divider-line']}></div>; // Make sure the DividerLine styling exists in your styles.module.css


export default Pro;
