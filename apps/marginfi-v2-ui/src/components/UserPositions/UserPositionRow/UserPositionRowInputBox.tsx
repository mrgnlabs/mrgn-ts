import { InputAdornment, TextField } from "@mui/material";
import { FC, MouseEventHandler } from "react";
import { NumberFormatValues, NumericFormat } from "react-number-format";

interface UserPositionRowInputBoxProps {
  value: number;
  setValue: (value: number) => void;
  maxValue?: number;
  maxDecimals?: number;
  disabled?: boolean;
}

const UserPositionRowInputBox: FC<UserPositionRowInputBoxProps> = ({
  value,
  setValue,
  maxValue,
  maxDecimals,
  disabled,
}) => {
  const onClick = () => {
    if (maxValue !== undefined) {
      setValue(maxValue);
    }
  };

  const onChange = (event: NumberFormatValues) => {
    const updatedAmountStr = event.value;
    if (updatedAmountStr !== "" && !/^\d*\.?\d*$/.test(updatedAmountStr)) return;
    const updatedAmount = Number(updatedAmountStr);
    if (maxValue !== undefined && updatedAmount > maxValue) {
      setValue(maxValue);
      return;
    }
    setValue(updatedAmount);
  };

  return (
    <NumericFormat
      value={value}
      placeholder="0"
      allowNegative={false}
      decimalScale={maxDecimals}
      onValueChange={onChange}
      thousandSeparator=","
      customInput={TextField}
      size="small"
      max={maxValue}
      InputProps={{
        className: "font-aeonik bg-[#1C2125] text-[#e1e1e1] p-0 m-0 text-sm h-11 ml-2 border border-[#4E5257]",
        endAdornment: <MaxInputAdornment onClick={onClick} disabled={disabled} />,
      }}
      disabled={disabled}
    />
  );
};

// @todo not happy with how this looks on small screens
const MaxInputAdornment: FC<{
  onClick: MouseEventHandler<HTMLDivElement>;
  disabled?: boolean;
}> = ({ onClick, disabled }) => (
  <InputAdornment position="end" classes={{ root: "w-[40px] h-full" }}>
    {!disabled && (
      <div
        className="font-aeonik p-0 pr-4 text-[#868E95] text-sm lowercase h-9 font-light flex justify-center items-center hover:bg-transparent cursor-pointer"
        onClick={onClick}
      >
        max
      </div>
    )}
  </InputAdornment>
);

export { UserPositionRowInputBox };
