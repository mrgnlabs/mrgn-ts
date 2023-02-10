import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PageHeader } from "~/components/PageHeader";
import { useUserAccounts } from "~/context";
import { LinearProgress } from '@mui/material';
import InfoIcon from "@mui/icons-material/Info";

// ================================
// INPUT BOX
// ================================
import { InputAdornment, TextField } from "@mui/material";
import { FC, MouseEventHandler, useCallback } from "react";
import { NumberFormatValues, NumericFormat } from "react-number-format";
import { toast } from "react-toastify";
// ================================
// INPUT BOX
// ================================

// ================================
// ACTION BUTTON
// ================================
import { Button, ButtonProps } from "@mui/material";
import { ReactNode } from "react";
import dynamic from "next/dynamic";
// ================================
// ACTION BUTTON
// ================================

// ================================
// ASSET SELECTION
// ================================
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import Image from "next/image";
// ================================
// ASSET SELECTION
// ================================

const Marks = ({ marks }) => (
  marks.map(
    (mark, index) => (
      <div
        className="flex flex-col"
        style={{
          border: 'solid white 1px',
        }}
      >
        <div
          key={index}
          style={{ 
            left: `${mark.value}%`,
            position: 'absolute',
            width: 20,
            height: 20,
            borderRadius: '50%',
            backgroundColor: `${mark.color}`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
          className="flex justify-center items-center"
        >
          <div
            className="mt-12 text-xs text-[#484848]"
            style={{
              letterSpacing: '4px',
            }}
          >
            {mark.label}
          </div>
        </div>        
      </div>
    ))
)

// ================================
// ACTION BUTTON
// ================================

const WalletMultiButtonDynamic = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

interface ProActionProps extends ButtonProps {
  children: ReactNode;
}

const ProAction: FC<ProActionProps> = ({ children, disabled, ...otherProps }) => {
  const wallet = useWallet();

  return wallet.connected ? (
    <Button
      className="bg-white text-black normal-case text-sm min-w-[360px] w-[360px] h-12 rounded-[100px]"
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

// ================================
// ACTION BUTTON
// ================================

// ================================
// INPUT BOX
// ================================

interface ProInputBox {
  value: number;
  setValue: (value: number) => void;
  maxValue?: number;
  maxDecimals?: number;
  disabled?: boolean;
}

const ProInputBox: FC<ProInputBox> = ({ value, setValue, maxValue, maxDecimals, disabled }) => {
  const onMaxClick = useCallback(() => {
    if (maxValue !== undefined) {
      setValue(maxValue);
    } else {
      toast.error("Not implemented");
    }
  }, [maxValue, setValue]);

  const onChange = useCallback(
    (event: NumberFormatValues) => {
      const updatedAmountStr = event.value;
      if (updatedAmountStr !== "" && !/^\d*\.?\d*$/.test(updatedAmountStr)) return;

      const updatedAmount = Number(updatedAmountStr);
      if (maxValue !== undefined && updatedAmount > maxValue) {
        setValue(maxValue);
        return;
      }

      setValue(updatedAmount);
    },
    [maxValue, setValue]
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
        className: "font-aeonik min-w-[360px] h-12 px-0 bg-[#1C2125] text-[#e1e1e1] text-sm font-light rounded-lg self-center",
        endAdornment: <MaxInputAdornment onClick={onMaxClick} />,
      }}
    />
  );
};

// @todo not happy with how this looks on small screens
const MaxInputAdornment: FC<{
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

// ================================
// INPUT BOX
// ================================

// ================================
// ASSET SELECTION
// ================================

const AssetSelection: FC = () => {

  return (
    <FormControl
      className="min-w-[360px] w-[360px]"
    >
      <RadioGroup
        defaultValue="SOL"
        className="flex flex-col justify-center items-center gap-2"
      >
        <FormControlLabel
          value="SOL"
          control={
            <Radio 
              className="bg-[#1E1E1E] mr-2"
              sx={{
                  color: '#1E1E1E',
                  '&.Mui-checked': {
                    color: '#3CAB5F',
                  },
              }}
            />
          }
          label={
            <div
              className="w-[295px] flex justify-between items-center"
            >
              <div>SOL</div>
              <Image src="https://cryptologos.cc/logos/solana-sol-logo.png?v=024" alt="SOL" height={30} width={30} />
            </div>
          }
          className="w-full bg-[#000] ml-0 mr-0 rounded-[100px] p-1 h-12"
          style={{ border: 'solid #1C2125 1px' }}
        />
        <FormControlLabel
          value="USDC" 
          control={
            <Radio 
              className="bg-[#1E1E1E] mr-2"
              sx={{
                  color: '#1E1E1E',
                  '&.Mui-checked': {
                    color: '#3CAB5F',
                  },
              }}
            />
          }
          label={
            <div
              className="w-[300px] flex justify-between items-center"
            >
              <div>USDC</div>
              <Image src="https://cryptologos.cc/logos/usd-coin-usdc-logo.png?v=024" alt="USDC" height={40} width={40} />
            </div>
          }
          className="w-full bg-[#000] ml-0 mr-0 rounded-[100px] p-1 h-12"
          style={{ border: 'solid #1C2125 1px' }}
        />
      </RadioGroup>
    </FormControl>
  )
}
// ================================
// ASSET SELECTION
// ================================

const Pro = () => {
  const wallet = useWallet();
  const { userAccounts } = useUserAccounts();

  const [progressPercent, setProgressPercent] = React.useState(50);

  const marks = [
    { value: 0, label: "CONNECT", color: progressPercent > 0 ? '#51B56A': '#484848' },
    { value: 50, label: "DEPOSIT", color: progressPercent >= 50 ? '#51B56A' : '#484848' },
    { value: 100, label: "CONFIRMED", color: progressPercent >= 100 ? '#51B56A' : '#484848' },
  ];

  const [amount, setAmount] = React.useState(0);

  return (
    <>
      <PageHeader />
      <div
        className="h-full flex flex-col justify-start items-center content-start py-[64px] w-4/5 max-w-7xl gap-4"
      >
        <div
          className="w-[360px] flex flex-col items-center gap-6"
        >
          <div className="w-[300px] h-[100px] grid grid-cols-2 mb-8">
            <div className="flex flex-col gap-1 w-[133%]">
              <div
                className="text-lg"
                style={{ fontWeight: 400 }}
              >
                Your Deposit: <span style={{ color: "#51B56A" }}>$0</span>
              </div>
              <div className="text-base text-[#2E2E2E]">Max Allocation: $500,000</div>
            </div>
            <div className="text-right flex flex-col">
              <div className="text-[#2E2E2E] text-base flex justify-end">
                APY
                <InfoIcon
                  className="ml-2"
                  // onMouseEnter={openTooltip} 
                />
              </div>
              <div className="text-[#D4FF59] text-xl" style={{ fontWeight: 400 }}>+9%</div>
            </div>
            <div className="col-span-full flex flex-col justify-center items-center">
                <LinearProgress
                  className="h-1 w-[300px] rounded-lg" 
                  variant="determinate"
                  color="inherit"
                  value={progressPercent}
                  sx={{
                      backgroundColor: '#484848',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: '#51B56A',
                      }
                  }}
                />
                <div className="flex absolute w-[300px] self-center justify-between">
                  <Marks marks={marks}/>
                </div>
            </div>
          </div>

        <div
          className="flex justify-center"
        >
          <AssetSelection />
        </div>

        <div className="flex justify-center">
          <ProInputBox
            value={amount}
            setValue={setAmount}
            maxValue={500000} // @todo hardcoded
            maxDecimals={2}
            disabled={(!(wallet.connected))}
          />
        </div>

        <div
          className="flex justify-center"
        >
          <ProAction></ProAction>
        </div>

        </div>
      </div>
    </>
  );
};

export default Pro;
