import * as React from "react";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import KeyboardOutlinedIcon from "@mui/icons-material/KeyboardOutlined";
import AppShortcutRoundedIcon from "@mui/icons-material/AppShortcutRounded";
import KeyboardCommandKeyRoundedIcon from "@mui/icons-material/KeyboardCommandKeyRounded";
import ArrowUpwardOutlinedIcon from "@mui/icons-material/ArrowUpwardOutlined";

const PopUp = () => {
  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? "simple-popover" : undefined;

  return (
    <div>
      <span aria-describedby={id} onClick={handleClick} className="glow-on-hover">
        <KeyboardOutlinedIcon
          sx={{
            fontSize: "18px",
            cursor: "pointer",
            marginLeft: "40px",
            "&:hover": {
              filter: "drop-shadow( 0 0 10px #dce85d)",
              color: "#dce85d",
            },
          }}
        />
      </span>
      <Popover
        id={id}
        open={open}
        anchorReference="anchorPosition"
        anchorPosition={{ top: 435, left: 235 }}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
      >
        <Typography
          sx={{
            background: "#171c1f",
            color: "rgb(255, 255, 255)",
            fontSize: "14px",
            width: "300px",
            boxShadow: "0px 0px 400px #dce85d",
          }}
        >
          <div
            style={{
              borderBottom: "solid rgba(227, 227, 227, 0.4) 1px",
            }}
            className="
            w-full
            py-2 
            px-4
            flex 
            items-center 
            justify-between
            
            "
          >
            <div className="flex items-center">
              {" "}
              <span className="tracking-widest font-bold pr-2">Shotcuts</span>
              <AppShortcutRoundedIcon
                sx={{
                  fontSize: "14px",
                }}
              />
            </div>
          </div>
          <div className="relative p-4 flex-auto text-xs">
            <ul className="w-full h-full font-semibold">
              <li className="w-full h-full flex items-center pb-2">
                <span className="glow">B </span>
                <span className="pl-6 tracking-widest">Bid tab</span>
              </li>
              <li className="w-full h-full flex items-center pb-2">
                <span className="glow">C </span>
                <span className="pl-6 tracking-widest">Cancel tab</span>
              </li>
              <li className="w-full h-full flex items-center pb-2">
                {" "}
                <span className="glow">L </span>
                <span className="pl-6 tracking-widest">List tab</span>
              </li>
              <li className="w-full h-full flex items-center pb-2">
                {" "}
                <span className="glow">S </span>
                <span className="pl-6 tracking-widest"> Sell now tab</span>
              </li>

              <li className="w-full h-full flex items-center pb-2">
                {" "}
                <span className="glow">M </span>
                <span className="pl-6 tracking-widest">Market-making tab</span>
              </li>
              <li className="w-full h-full flex items-center pb-2">
                {" "}
                <span className="flex items-center glow">
                  <KeyboardCommandKeyRoundedIcon
                    sx={{
                      fontSize: "14px",
                    }}
                  />{" "}
                  <span className="pl-2 glow">K</span>
                </span>
                <span className="pl-6 tracking-widest"> Search bar</span>
              </li>
              <li className="w-full h-full flex items-center pb-2">
                {" "}
                <span className="flex items-center glow bg-transparent">
                  <ArrowUpwardOutlinedIcon
                    sx={{
                      fontSize: "14px",
                    }}
                  />{" "}
                  <span className="pl-2 glow">Click</span>
                </span>
                <span className="pl-6 tracking-widest"> Select range of pools</span>
              </li>
            </ul>
          </div>
        </Typography>
      </Popover>
    </div>
  );
};

export default PopUp;
