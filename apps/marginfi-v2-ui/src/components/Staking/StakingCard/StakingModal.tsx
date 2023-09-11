import { Typography, Skeleton, Input, InputBase, Modal, Box } from "@mui/material";
import Image from "next/image";
import Link from "next/link";
import { FC } from "react";
import { MrgnTooltip } from "~/components/Tooltip";

import { numeralFormatter, percentFormatterDyn } from "@mrgnlabs/mrgn-common";
import { ArrowDropDown, Close } from "@mui/icons-material";

interface StakingModalProps {
  isOpen: boolean;
  handleClose: () => void;
}

export const StakingModal: FC<StakingModalProps> = ({ isOpen, handleClose }) => {
  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      aria-labelledby="parent-modal-title"
      aria-describedby="parent-modal-description"
      className="border-none"
    >
      <div className="mx-auto mt-40 rounded-xl bg-[#1C2023] w-[400px] h-[500px] p-4">
        <div className="flex flex-row justify-between">
          <Typography className="font-aeonik font-[700] text-2xl inline">Select token</Typography>
          <div className="cursor-pointer" onClick={handleClose}>
            <Close />
          </div>
        </div>
      </div>
    </Modal>
  );
};
