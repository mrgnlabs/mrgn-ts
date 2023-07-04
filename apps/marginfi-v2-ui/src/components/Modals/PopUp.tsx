import * as React from "react";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import KeyboardOutlinedIcon from "@mui/icons-material/KeyboardOutlined";
import AppShortcutRoundedIcon from "@mui/icons-material/AppShortcutRounded";
import KeyboardCommandKeyRoundedIcon from "@mui/icons-material/KeyboardCommandKeyRounded";

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
      <span aria-describedby={id} onClick={handleClick}>
        <KeyboardOutlinedIcon
          sx={{
            fontSize: "18px",
            cursor: "pointer",
            "&:hover": {
              boxShadow: "0px 0px 20px rgba(9, 194, 246, 0.4)",
            },
          }}
        />
      </span>
      <Popover
        id={id}
        open={open}
        anchorReference="anchorPosition"
        anchorPosition={{ top: 460, left: 235 }}
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
            width: "250px",
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
            <span className="tracking-widest font-bold"> Shotcuts</span>
            <span>
              {" "}
              <AppShortcutRoundedIcon
                sx={{
                  fontSize: "14px",
                  "&:hover": {
                    boxShadow: "0px 0px 20px rgba(9, 194, 246, 0.4)",
                  },
                }}
              />
            </span>
          </div>
          <div className="relative p-4 flex-auto text-xs">
            <ul className="w-full h-full font-semibold">
              <li className="w-full h-full flex items-center pb-2">
                <span className="shadow-[0_0_10px_black] ">B </span>
                <span className="pl-6 tracking-widest">Bid tab</span>
              </li>
              <li className="w-full h-full flex items-center pb-2">
                <span className="shadow-[0_0_10px_black]">C </span>
                <span className="pl-6 tracking-widest">Cancel tab</span>
              </li>
              <li className="w-full h-full flex items-center pb-2">
                {" "}
                <span className="shadow-[0_0_10px_black]">L </span>
                <span className="pl-6 tracking-widest">List tab</span>
              </li>
              <li className="w-full h-full flex items-center pb-2">
                {" "}
                <span className="shadow-[0_0_10px_black]">S </span>
                <span className="pl-6 tracking-widest"> Sell now tab</span>
              </li>

              <li className="w-full h-full flex items-center pb-2">
                {" "}
                <span className="shadow-[0_0_10px_black]">M </span>
                <span className="pl-6 tracking-widest">Market-making tab</span>
              </li>
              <li className="w-full h-full flex items-center pb-2">
                {" "}
                <span className="flex items-center shadow-[0_0_10px_black]">
                  <KeyboardCommandKeyRoundedIcon
                    sx={{
                      fontSize: "14px",
                      "&:hover": {
                        boxShadow: "0px 0px 20px rgba(9, 194, 246, 0.4)",
                      },
                    }}
                  />{" "}
                  <span className="pl-2">K</span>
                </span>
                <span className="pl-6 tracking-widest"> Search bar</span>
              </li>
            </ul>
          </div>
        </Typography>
      </Popover>
    </div>
  );
};

export default PopUp;
