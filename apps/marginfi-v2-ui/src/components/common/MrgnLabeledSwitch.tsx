import { styled, Switch, SwitchProps } from "@mui/material";

interface MrgnLabeledSwitchProps extends SwitchProps {
  labelLeft: string;
  labelRight: string;
  trackColor?: string;
  thumbColor?: string;
}

const MrgnLabeledSwitch = styled(({ onChange, ...switchProps }: MrgnLabeledSwitchProps) => {
  return (
    <Switch
      {...switchProps}
      focusVisibleClassName=".Mui-focusVisible"
      disableRipple
    />
  );
})(({ disabled, labelLeft, labelRight,trackColor, thumbColor }) => ({
  width: "100%",
  height: "100%",
  ...(disabled ? { cursor: "not-allowed" } : {}),
  padding: 0,
  backgroundColor: trackColor ?? "#22282C", // @todo currently transparency is at 1 to hide the center thing that i can't make disappear
  borderRadius: 4,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  fontFamily: "Aeonik Pro",
  fontWeight: 400,
  "&:before": {
    content: `"${labelLeft}"`,
    width: "50%",
    height: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    pointerEvents: "none",
  },
  "&:after": {
    content: `"${labelRight}"`,
    width: "50%",
    height: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    pointerEvents: "none",
  },
  "& .MuiSwitch-switchBase": {
    padding: "0.3rem",
    width: "50%",
    height: "100%",
    display: "flex",
    justifyContent: "center",
    transitionDuration: "200ms",
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
    backgroundColor: "#1B1E20",
  },
  "& .MuiSwitch-thumb": {
    boxSizing: "border-box",
    width: "100%",
    height: "100%",
    backgroundColor: thumbColor ?? "#131618",
    borderRadius: 3,
  },
}));

export { MrgnLabeledSwitch as MrgnSwitch };
