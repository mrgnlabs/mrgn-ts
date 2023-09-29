import { Switch, SwitchProps, styled } from "@mui/material";

const MrgnContainedSwitch = styled((switchProps: SwitchProps) => <Switch {...switchProps} disableRipple />)(({checked}) => ({
  padding: 8,
  marginLeft: -8,
  "& .MuiSwitch-track": {
    borderRadius: 22 / 2,
    opacity: 1,
    backgroundColor: "#22282C",
    "&:before, &:after": {
      content: '""',
      position: "absolute",
      top: "50%",
      transform: "translateY(-50%)",
      width: 16,
      height: 16,
    },
    "&:before": {
      backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="16" width="16" viewBox="0 0 24 24"><path fill="${encodeURIComponent(
        checked ? "black" : "#DCE85D"
        )}" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg>')`,
      left: 12,
    },
    "&:after": {
      backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="16" width="16" viewBox="0 0 24 24"><path fill="${encodeURIComponent(
        checked ? "black" : "#DCE85D"
      )}" d="M19,13H5V11H19V13Z" /></svg>')`,
      right: 12,
    },
  },
  "& .MuiSwitch-switchBase": {
    height: "100%",
    "& + .MuiSwitch-track": {
      backgroundColor: "#22282C",
      height: "100%",
    },
    "&.Mui-checked + .MuiSwitch-track": {
      opacity: 1,
      backgroundColor: "#DCE85D",
    },
  },
  "& .MuiSwitch-thumb": {
    boxShadow: "none",
    width: 16,
    height: 16,
    margin: 2,
    backgroundColor: "#09090B",
  },
  "&:hover .MuiSwitch-thumb": {
    backgroundColor: "#09090B",
  },
}));

export { MrgnContainedSwitch };
