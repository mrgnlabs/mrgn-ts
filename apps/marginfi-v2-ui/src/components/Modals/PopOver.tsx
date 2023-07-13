import * as React from "react";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";

interface PopOverProps {
  title: string;
  top: number;
  left: number;
  solPrice?: string;
  solanaTransactionPerSecond?: string;
}

const MouseOverPopover: React.FC<PopOverProps> = ({ title, top, left, solPrice, solanaTransactionPerSecond }) => {
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);

  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  return (
    <div>
      <Typography
        aria-owns={open ? "mouse-over-popover" : undefined}
        aria-haspopup="true"
        onMouseEnter={handlePopoverOpen}
        onMouseLeave={handlePopoverClose}
        sx={{
          fontSize: "14px",
          fontWeight: "100",
        }}
      >
        {solPrice || solanaTransactionPerSecond}
      </Typography>
      <Popover
        id="mouse-over-popover"
        sx={{
          pointerEvents: "none",
        }}
        open={open}
        anchorReference="anchorPosition"
        anchorPosition={{ top: top, left: left }}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        onClose={handlePopoverClose}
        disableRestoreFocus
      >
        <Typography
          sx={{
            p: 1,
            background: "#171c1f",
            color: "rgb(255, 255, 255)",
            fontSize: "14px",
          }}
        >
          {title}
        </Typography>
      </Popover>
    </div>
  );
};

export default MouseOverPopover;
