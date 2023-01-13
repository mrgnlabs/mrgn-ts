import { styled, Switch, SwitchProps } from "@mui/material";

interface BorrowLendToggleProps extends SwitchProps {
  isInLendingMode: boolean;
  setIsInLendingMode: React.Dispatch<React.SetStateAction<boolean>>;
}

const BorrowLendToggle = styled(
  ({
    isInLendingMode,
    setIsInLendingMode,
    ...switchProps
  }: BorrowLendToggleProps) => {
    const handleChange = () => {
      setIsInLendingMode((prev) => !prev);
    };

    return (
      <Switch
        focusVisibleClassName=".Mui-focusVisible"
        disableRipple
        {...switchProps}
        checked={!isInLendingMode}
        onChange={handleChange}
      />
    );
  }
)(({ disabled }) => ({
  width: 166.34, //
  height: 52.04,
  ...(disabled ? { cursor: "not-allowed" } : {}),
  padding: 0,
  borderRadius: 43.61,
  backgroundColor: "rgba(0,0,0,1)", // @todo currently transparency is at 1 to hide the center thing that i can't make disappear
  border: "solid rgba(255, 255, 255, 0.20) 1px",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  paddingLeft: "27px",
  paddingRight: "18px",
  "&:after": {
    content: "'Borrow'",
    zIndex: 10,
    pointerEvents: "none",
    fontFamily: "Aeonik Pro Medium",
  },
  "&:before": {
    content: "'Lend'",
    zIndex: 10,
    pointerEvents: "none",
    fontFamily: "Aeonik Pro Medium",
  },
  "& .MuiSwitch-switchBase": {
    padding: 0,
    marginTop: "0.28rem",
    marginLeft: "0.3rem",
    width: "48%",
    height: "80%",
    borderRadius: 43.61,
    display: "flex",
    justifyContent: "center",
    transitionDuration: "300ms", // ios transition time
    "&.Mui-checked": {
      transform: "translateX(4.66rem)",
      color: "#fff",
      "& + .MuiSwitch-track": {
        backgroundColor: "rgba(0,0,0,0)",
        opacity: 0,
        border: 0,
      },
      "&.Mui-disabled + .MuiSwitch-track": {
        opacity: 0.5,
      },
    },
  },
  "& .MuiSwitch-thumb": {
    boxSizing: "border-box",
    width: "100%",
    height: "100%",
    borderRadius: 43.61,
    backgroundColor: "#2F373D",
    border: "solid rgba(255, 255, 255, 0.2) 1px",
  },
}));

export { BorrowLendToggle };
