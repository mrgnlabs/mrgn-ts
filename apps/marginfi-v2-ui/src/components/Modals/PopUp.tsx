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
      <span aria-describedby={id} onClick={handleClick} className="glow-on-hover">
        <KeyboardOutlinedIcon
          sx={{
            fontSize: "18px",
            cursor: "pointer",
            marginLeft: "40px",
          }}
        />
      </span>
      <Popover
        id={id}
        open={open}
        anchorReference="anchorPosition"
        anchorPosition={{ top: 530, left: 55 }}
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
            width: "400px",
          }}
        >
          <div
            style={{
              borderBottom: "solid rgba(227, 227, 227, 0.4) 1px",
            }}
            className="w-full py-2 px-2 flex items-center justify-between"
          >
            <div className="flex items-center">
              <span className="tracking-widest font-bold pr-2">Shotcuts</span>
              <AppShortcutRoundedIcon
                sx={{
                  fontSize: "14px",
                }}
              />
            </div>
          </div>
          <div className="relative flex-auto text-xs">
            <ul className="w-full h-full font-semibold flex items-center flex-col mx-2">
              <li className="w-full h-full flex items-center m-2">
                <div className="flex items-center">
                  <span>ctrl /</span>
                  <KeyboardCommandKeyRoundedIcon
                    sx={{
                      fontSize: "14px",
                    }}
                  />
                </div>
                <span className="tracking-widest ml-8">All available hotkey combinations and badges</span>
              </li>

              <li className="w-full h-full flex items-center mb-2">
                {" "}
                <div className="flex items-center ">
                  <span>ctrl /</span>
                  <KeyboardCommandKeyRoundedIcon
                    sx={{
                      fontSize: "14px",
                    }}
                  />{" "}
                  <span className="ml-2 ">s</span>
                </div>
                <span className="tracking-widest ml-4"> swap</span>
              </li>
              <li className="w-full h-full flex items-center mb-2">
                {" "}
                <div className="flex items-center  ">
                  <span>ctrl /</span>
                  <KeyboardCommandKeyRoundedIcon
                    sx={{
                      fontSize: "14px",
                    }}
                  />{" "}
                  <span className="ml-2">e</span>
                </div>
                <span className="tracking-widest ml-4"> earn</span>
              </li>
              <li className="w-full h-full flex items-center mb-2">
                {" "}
                <div className="flex items-center  ">
                  {" "}
                  <span>ctrl /</span>
                  <KeyboardCommandKeyRoundedIcon
                    sx={{
                      fontSize: "14px",
                    }}
                  />{" "}
                  <span className="ml-2">o</span>
                </div>
                <span className="tracking-widest ml-4"> omni</span>
              </li>
            </ul>
          </div>
        </Typography>
      </Popover>
    </div>
  );
};

export default PopUp;
