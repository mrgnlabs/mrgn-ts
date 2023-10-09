import { styled, Switch, SwitchProps } from "@mui/material";
import { Dispatch, SetStateAction } from "react";

interface LstDepositToggleProps extends SwitchProps {
  checked: boolean;
  setChecked: Dispatch<SetStateAction<boolean>>;
}

const LstDepositToggle = styled(({ checked, setChecked, ...switchProps }: LstDepositToggleProps) => {
  const handleChange = () => {
    setChecked((prev) => !prev);
  };

  return (
    <Switch
      {...switchProps}
      focusVisibleClassName=".Mui-focusVisible"
      disableRipple
      checked={!checked}
      onChange={handleChange}
      disabled={false}
    />
  );
})(({ disabled }) => ({
  width: "100%",
  height: "100%",
  ...(disabled ? { cursor: "not-allowed" } : {}),
  padding: 0,
  backgroundColor: "rgba(0,0,0,1)", // @todo currently transparency is at 1 to hide the center thing that i can't make disappear
  borderRadius: 5,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  fontFamily: "Aeonik Pro",
  fontWeight: 400,
  "&:before": {
    content: '"Tokens"',
    width: "50%",
    height: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    pointerEvents: "none",
  },
  "&:after": {
    content: '"Native Stake"',
    width: "50%",
    height: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    pointerEvents: "none",
  },
  "& .MuiSwitch-switchBase": {
    padding: "0.25rem",
    width: "50%",
    height: "100%",
    display: "flex",
    justifyContent: "center",
    transitionDuration: "300ms",
    transform: "translateX(0%)",
    "& + .MuiSwitch-track": {
      opacity: 0,
      width: 0,
      height: "100%",
    },
    "&.Mui-disabled + .MuiSwitch-track": {
      opacity: 0.5,
    },
    "&.Mui-checked": {
      transform: "translateX(100%)",
    },
  },
  "&:hover .MuiSwitch-thumb": {
    backgroundColor: "#394147",
  },
  "& .MuiSwitch-thumb": {
    boxSizing: "border-box",
    width: "100%",
    height: "100%",
    backgroundColor: "#2F373D",
    borderRadius: 4,
  },
}));

export { LstDepositToggle };
