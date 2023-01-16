import { TextField, InputAdornment, Button } from "@mui/material";
import { FC, MouseEvent } from "react";
import { NumberFormatValues, NumericFormat } from "react-number-format";
import { toast } from "react-toastify";

interface UserPositionRowInputBoxProps {
  value: number;
  setValue: (value: number) => void;
}

const UserPositionRowInputBox: FC<UserPositionRowInputBoxProps> = ({
  value,
  setValue,
}) => {
  const onClick = (_event: MouseEvent<HTMLButtonElement>) => {
    toast.error("not implemented");
  };

  const onChange = (event: NumberFormatValues) => {
    const updatedAmountStr = event.value;
    if (updatedAmountStr !== "" && !/^\d*\.?\d*$/.test(updatedAmountStr))
      return;
    const updatedAmount = Number(updatedAmountStr);
    setValue(updatedAmount);
  };

  return (
    <NumericFormat
      value={value}
      placeholder="0"
      allowNegative={false}
      decimalScale={6}
      onValueChange={onChange}
      thousandSeparator=","
      customInput={TextField}
      size="small"
      InputProps={{
        className:
          "bg-[#1C2125] text-[#515151] text-sm rounded-lg pr-0 w-full h-10 font-light",
        style: {
          fontFamily: "Aeonik Pro",
        },
        endAdornment: <MaxInputAdornment onClick={onClick} />,
      }}
    />
  );
};

// @todo not happy with how this looks on small screens
const MaxInputAdornment: FC<{
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}> = ({ onClick }) => (
  <InputAdornment position="end">
    <Button
      classes={{
        root: "p-0 text-[#868E95] text-xs lowercase h-9 font-light",
      }}
      style={{
        fontFamily: "Aeonik Pro",
      }}
      sx={{ "&:hover": { backgroundColor: "transparent" } }}
      onClick={onClick}
      variant="text"
      disableRipple
    >
      max
    </Button>
  </InputAdornment>
);

export { UserPositionRowInputBox };
