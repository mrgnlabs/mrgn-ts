import { InputAdornment, TextField } from "@mui/material";
import { FC, MouseEventHandler, useCallback } from "react";
import { NumberFormatValues, NumericFormat } from "react-number-format";
import { toast } from "react-toastify";

interface AssetRowInputBox {
  value: number;
  setValue: (value: number) => void;
  maxValue?: number;
  maxDecimals?: number;
  disabled?: boolean;
  tokenName: string;
  inputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
}

const AssetRowInputBox: FC<AssetRowInputBox> = ({
  value,
  setValue,
  maxValue,
  maxDecimals,
  disabled,
  tokenName,
  inputRefs,
}) => {
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
    <div className="flex justify-center">
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
          className: "font-aeonik text-[#e1e1e1] border border-[#4E5257] p-0 m-0 text-sm h-11",
          endAdornment: <MaxInputAdornment onClick={onMaxClick} disabled={disabled} />,
        }}
        getInputRef={(el: any) => (inputRefs.current[tokenName] = el)}
      />
    </div>
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
        className={`font-aeonik p-0 pr-4 text-[#868E95] text-sm lowercase h-9 font-light flex justify-center items-center hover:bg-transparent ${
          disabled ? "cursor-default" : "cursor-pointer"
        }`}
        onClick={onClick}
      >
        max
      </div>
    )}
  </InputAdornment>
);

export { AssetRowInputBox };
