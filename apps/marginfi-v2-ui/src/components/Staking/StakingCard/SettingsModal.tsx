import { Typography, Modal, SvgIcon } from "@mui/material";
import { Dispatch, FC, SetStateAction, useEffect, useMemo, useState } from "react";
import { Close } from "@mui/icons-material";
import { TokenData } from "./StakingCard";
import Image from "next/image";
import { PublicKey } from "@solana/web3.js";
import { NumberFormatValues, NumericFormat } from "react-number-format";
import { PrimaryButton } from "./PrimaryButton";

interface SettingsModalProps {
  isOpen: boolean;
  handleClose: () => void;
  setSelectedSlippage: Dispatch<SetStateAction<number>>;
  selectedSlippage: number;
}

const SLIPPAGE_PRESET = [0.1, 0.5, 1.0, 5.0];

export const SettingsModal: FC<SettingsModalProps> = ({
  isOpen,
  handleClose,
  selectedSlippage,
  setSelectedSlippage,
}) => {
  const [localSlippage, setLocalSlippage] = useState<number>();
  useEffect(() => setLocalSlippage(selectedSlippage), [selectedSlippage]);

  const onSaveSettings = () => {
    setSelectedSlippage(localSlippage);
    handleClose();
  };

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      aria-labelledby="parent-modal-title"
      aria-describedby="parent-modal-description"
      className="border-none"
    >
      <div className="mx-auto mt-48 rounded-xl bg-[#1C2023] w-[400px] max-w-[90%]  p-4">
        <div className="flex flex-row justify-between mb-3">
          <Typography className="font-aeonik font-[700] text-2xl inline">Swap Settings</Typography>
          <div className="cursor-pointer" onClick={handleClose}>
            <Close />
          </div>
        </div>
        <Typography className="font-aeonik font-[500] text-xl">Slippage Settings</Typography>
        <div className="flex flex-row items-center mt-2.5 rounded-xl overflow-hidden text-sm mb-10">
          {SLIPPAGE_PRESET.map((slippage, idx) => {
            const displayText = Number(slippage) + "%";
            const isHighlighted = localSlippage === slippage;
            return (
              <a
                key={idx}
                className={`relative cursor-pointer flex-1 text-secondary py-3 ${
                  isHighlighted ? "bg-[#303437]" : "bg-[#1B1B1E]"
                }`}
                onClick={() => {
                  setLocalSlippage(slippage);
                }}
              >
                <div className="h-full w-full leading-none flex justify-center items-center">
                  <Typography className={`text-secondary mt-[2px]`}>{displayText}</Typography>
                </div>
              </a>
            );
          })}
        </div>
        <PrimaryButton onClick={() => onSaveSettings()}>Save</PrimaryButton>
      </div>
    </Modal>
  );
};
