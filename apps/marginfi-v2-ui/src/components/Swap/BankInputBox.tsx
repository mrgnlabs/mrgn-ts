import React, { FC, useCallback } from "react";
import { ExtendedBankInfo } from "~/types";
import { NumberFormatValues, NumericFormat } from "react-number-format";
import { InputAdornment, SelectChangeEvent, TextField } from "@mui/material";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Image from "next/image";
import { QuestionMark } from "@mui/icons-material";

interface InputBoxProps {
  value: number;
  setValue: (value: number) => void;
  banks: ExtendedBankInfo[];
  selectedBank: ExtendedBankInfo;
  setSelectedBank: (selectedBank: ExtendedBankInfo) => void;
  maxValue?: number;
  maxDecimals?: number;
  disabled?: boolean;
  showMaxButton?: boolean;
}

const BankInputBox: FC<InputBoxProps> = ({
  value,
  setValue,
  maxValue,
  maxDecimals,
  disabled,
  banks,
  selectedBank,
  setSelectedBank,
  // showMaxButton = true,
}) => {
  // const onMaxClick = useCallback(() => {
  //   if (maxValue !== undefined) {
  //     setValue(maxValue);
  //   } else {
  //     toast.error("Max value not implemented");
  //   }
  // }, [maxValue, setValue]);

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
    <div className="w-full mb-1">
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
          className: "flex items-center h-[64px] w-[315px] p-1 rounded bg-[#1C2125] text-white text-xl",
          endAdornment: <BankSelect banks={banks} selectedBank={selectedBank} onBankChange={setSelectedBank} />,
        }}
      />
    </div>
  );
};

interface BankSelectProps {
  banks: ExtendedBankInfo[];
  selectedBank: ExtendedBankInfo;
  onBankChange: (selectedBank: ExtendedBankInfo) => void;
}

const BankSelect: FC<BankSelectProps> = ({ banks, selectedBank, onBankChange }) => {
  const _onBankChange = useCallback(
    (event: SelectChangeEvent<string>) => {
      const bank = banks.find((bank) => bank.tokenName === event.target.value);
      if (bank) {
        onBankChange(bank);
      }
    },
    [banks, onBankChange]
  );

  return (
    <InputAdornment position="end" classes={{ root: "h-full mr-4" }}>
      <Select
        value={selectedBank.tokenName}
        onChange={_onBankChange}
        className={`text-[#e1e1e1] bg-[#1C2125] border-[2px] border-${
          selectedBank.intrinsicColor || "#e1e1e1"
        } max-h-full text-base rounded-[100px] min-w-[130px]`}
      >
        {banks.map((bank) => (
          <MenuItem key={bank.tokenName} value={bank.tokenName}>
            <div className="flex">
              {bank.tokenIcon ? (
                <Image src={bank.tokenIcon} alt={bank.tokenName} height={25} width={25} className="mr-2" />
              ) : (
                <QuestionMark width={25} height={25} className="mr-2" />
              )}
              <div>{bank.tokenName}</div>
            </div>
          </MenuItem>
        ))}
      </Select>
    </InputAdornment>
  );
};

export { BankInputBox };
