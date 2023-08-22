import React, { FC, MouseEventHandler, ReactNode, useCallback, useMemo, useState, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PageHeader } from "~/components/PageHeader";
import { Button, ButtonProps, InputAdornment, TextField } from "@mui/material";
import { NumberFormatValues, NumericFormat } from "react-number-format";
import dynamic from "next/dynamic";
import Image from "next/image";
import { PublicKey } from "@solana/web3.js";

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
  const [stakeTVL, setStakeTVL] = useState(null);

  useEffect(() => {
    const fetchTVL = async () => {
      const account = await connection.getAccountInfo(new PublicKey('Jito4APyf642JPZPx3hGc6WWJ8zPKtRbRs4P815Awbb'));
      if (account) {
        // @TODO: Fix
        setStakeTVL(Number(account.data.readBigUint64LE(258)) / 1e9);
      }
    };

    fetchTVL();
  }, [connection]);

  const maxDepositAmount = useMemo(
    () => 1,
    []
  )

  const depositAction = useCallback(async () => {

  }, []);

  return (
    <>
      <PageHeader text="stake"/>
      <div className="h-full flex flex-col justify-start items-center content-start py-[72px] sm:py-[48px] w-4/5 max-w-7xl gap-4">
        <div className="w-[360px] flex flex-col items-center gap-6">

          <div className="text-[#D9D9D9] text-5xl font-[500] text-center w-full flex justify-center gap-2">
            <Image src="/lst_logo.png" alt="lst" height={48} width={48}/>
            $LST
          </div>
          <div className="text-[#fff] text-xl text-center">
            <span className="text-[#DCE85D]">It's in the name.</span>
          </div>

          <div className="flex justify-center w-full pl-6">
            <div className="grid grid-cols-4 gap-1 mx-auto w-full">
              <div className="text-[#fff] text-sm">
                APY
              </div>
              <div className="text-[#fff] text-sm">
                TVL
              </div>
              <div className="text-[#fff] text-sm">
                FEES
              </div>
              <div className="text-[#fff] text-sm">
                POINTS
              </div>

              <div className="text-[#fff] text-2xl">
                8%
              </div>
              <div className="text-[#fff] text-2xl">
                {`${stakeTVL ? stakeTVL : ''}`}
              </div>
              <div className="text-[#fff] text-2xl">
                0%
              </div>
              <div className="text-[#fff] text-2xl">
                100M
              </div>
            </div>
          </div>

        <div className="flex justify-center">
          <ProInputBox
            value={amount}
            setValue={setAmount}
            maxValue={maxDepositAmount}
            loadingSafetyCheck={() => true}
            maxDecimals={2}
            disabled={!wallet.connected}
          />
        </div>

        <div className="flex justify-center">
          <ProAction
            onClick={depositAction}
          >
            Mint
          </ProAction>
        </div>
      </div>
    </div>
  </>
  );
};

export default Pro;
