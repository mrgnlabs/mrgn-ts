import { TextField, InputAdornment, Button } from "@mui/material";
import { FC, useCallback } from "react";
import { NumberFormatValues, NumericFormat } from "react-number-format";
import { toast } from "react-toastify";

interface AssetRowInputBox {
  value: number;
  setValue: (value: number) => void;
  maxValue?: number;
  maxDecimals?: number;
  disabled?: boolean;
}

const AssetRowInputBox: FC<AssetRowInputBox> = ({ value, setValue, maxValue, maxDecimals, disabled }) => {
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
        className: "bg-[#1C2125] text-[#e1e1e1] text-sm rounded-lg pr-0 w-50 h-12 font-light",
        style: {
          fontFamily: "Aeonik Pro",
        },
        endAdornment: <MaxInputAdornment onClick={onMaxClick} disabled={disabled} />,
      }}
    />
  );
};

// @todo not happy with how this looks on small screens
const MaxInputAdornment: FC<{
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
}> = ({ onClick, disabled }) => (
  <InputAdornment
    position="end"
    className="h-full"
    style={{
      width: "45px",
    }}
  >
    <Button
      classes={{
        root: "p-0 text-[#868E95] text-sm lowercase h-9 font-light flex justify-start pl-1",
      }}
      style={{
        fontFamily: "Aeonik Pro",
      }}
      sx={{ "&:hover": { backgroundColor: "transparent" } }}
      onClick={onClick}
      variant="text"
      disableRipple
      disabled={disabled}
    >
      max
    </Button>
  </InputAdornment>
);

export { AssetRowInputBox };
