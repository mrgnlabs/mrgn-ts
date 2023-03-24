import React, { FC, useState, useCallback } from 'react';
import { ExtendedBankInfo } from "~/types";
import { NumberFormatValues, NumericFormat } from "react-number-format";
import { TextField, InputAdornment } from '@mui/material';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import Image from "next/image";

interface InputBoxProps {
  value: number;
  setValue: (value: number) => void;
  maxValue?: number;
  maxDecimals?: number;
  extendedBankInfos: ExtendedBankInfo[];
  label: string;
  top: boolean;
  showMaxButton?: boolean;
}

const InputBox: FC<InputBoxProps> = ({ 
  value, 
  setValue, 
  maxValue, 
  maxDecimals, 
  disabled,
  extendedBankInfos, 
  label, 
  top, 
  showMaxButton = true 
}) => {
  const [selectedBank, setSelectedBank] = useState(extendedBankInfos[top ? 0 : 1])

  const handleBankChange = (event: SelectChangeEvent) => {
    const selectedValue = event.target.value as string;
    setSelectedBank(extendedBankInfos.find((bank) => bank.tokenName === selectedValue) || extendedBankInfos[top ? 0 : 1]);
  };

  const onMaxClick = useCallback(() => {
    if (maxValue !== undefined) {
      setValue(maxValue);
    } else {
      toast.error("Max value not implemented");
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
    <div className="w-full mb-1">
      {
        top && (
          <label className="block text-[#e1e1e1] text-sm px-0.5">{label}</label>
        )
      }
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
          endAdornment: <BankSelect 
            selectedBank={selectedBank}
            handleBankChange={handleBankChange}
            extendedBankInfos={extendedBankInfos}
          />,
        }}
      />
      
      {
        !top && (
          <label className="block text-[#e1e1e1] text-sm px-0.5">{label}</label>
        )
      }
    </div>
  );
};

interface BankSelectProps {
  selectedBank: ExtendedBankInfo;
  handleBankChange: (event: React.ChangeEvent<{ value: unknown }>) => void;
  extendedBankInfos: ExtendedBankInfo[];
}

const BankSelect: FC<> = ({
  selectedBank,
  handleBankChange,
  extendedBankInfos,
}) => (
  <InputAdornment position="end" classes={{ root: "h-full mr-4" }}>
      <Select
        value={selectedBank.tokenName}
        onChange={handleBankChange}
        className={`text-[#e1e1e1] bg-[#1C2125] border-[2px] border-${selectedBank.borderColor || '#e1e1e1'} max-h-full text-base rounded-[100px] min-w-[130px]`}
      >
        {
          extendedBankInfos.map(
            (bankInfo) => (
              <MenuItem
                key={bankInfo.tokenName}
                value={bankInfo.tokenName}
              >
                <div className="flex">
                  <Image src={bankInfo.tokenIcon} alt={bankInfo.tokenName} height={25} width={25} className="mr-2" />
                  <div className="mr-6">{bankInfo.tokenName}</div>
                </div>
                
              </MenuItem>
            )
          )
        }
      </Select>
  </InputAdornment>
)

export { InputBox }
