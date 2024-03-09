import { Typography, Modal } from "@mui/material";
import { Dispatch, FC, SetStateAction, useState } from "react";
import { Close } from "@mui/icons-material";
import { PrimaryButton } from "./PrimaryButton";
import { SupportedSlippagePercent } from "~/store/lstStore";

interface SettingsModalProps {
  isOpen: boolean;
  handleClose: () => void;
  setSelectedSlippagePercent: (slippage: SupportedSlippagePercent) => void;
  selectedSlippagePercent: SupportedSlippagePercent;
}

const SLIPPAGE_PRESET: SupportedSlippagePercent[] = [0.1, 0.5, 1.0, 5.0];

export const SettingsModal: FC<SettingsModalProps> = ({
  isOpen,
  handleClose,
  selectedSlippagePercent: selectedSlippage,
  setSelectedSlippagePercent: setSelectedSlippage,
}) => {
  const [localSlippage, setLocalSlippage] = useState<SupportedSlippagePercent>(selectedSlippage);

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
      <div className="mx-auto mt-48 rounded-xl bg-[#1C2023] w-[400px] max-w-[90%]  p-4 focus-visible:outline-none">
        <div className="flex flex-row justify-between mb-3">
          <Typography className="font-aeonik font-[700] text-2xl inline">Swap Settings</Typography>
          <div className="cursor-pointer" onClick={handleClose}>
            <Close />
          </div>
        </div>
        <Typography className="font-aeonik font-[400] text-lg">Slippage Settings</Typography>
        <div className="flex flex-row items-center mt-2.5 rounded-xl overflow-hidden text-sm mb-10">
          {SLIPPAGE_PRESET.map((slippage, idx) => {
            const displayText = Number(slippage) + "%";
            const isHighlighted = localSlippage === slippage;
            return (
              <a
                key={idx}
                className={`relative cursor-pointer flex-1 text-primary py-3 ${
                  isHighlighted ? "bg-chartreuse hover:bg-chartreuse" : "bg-[#1B1B1E] hover:bg-gray-700"
                }`}
                onClick={() => {
                  setLocalSlippage(slippage);
                }}
              >
                <div className="h-full w-full leading-none flex justify-center items-center">
                  <Typography className={`mt-[2px] ${isHighlighted ? "text-accent" : "text-muted-foreground"}`}>
                    {displayText}
                  </Typography>
                </div>
              </a>
            );
          })}
        </div>
        <div className="h-[36px]">
          <PrimaryButton onClick={() => onSaveSettings()}>Save</PrimaryButton>
        </div>
      </div>
    </Modal>
  );
};
