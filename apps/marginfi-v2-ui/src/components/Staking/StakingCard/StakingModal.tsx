import { Typography, Modal } from "@mui/material";
import { Dispatch, FC, SetStateAction } from "react";
import { Close } from "@mui/icons-material";
import { TokenData } from "./StakingCard";
import Image from "next/image";
import { PublicKey } from "@solana/web3.js";

interface StakingModalProps {
  isOpen: boolean;
  handleClose: () => void;
  setSelectedMint: Dispatch<SetStateAction<PublicKey>>;
  supportedTokens: TokenData[];
}

export const StakingModal: FC<StakingModalProps> = ({ isOpen, handleClose, supportedTokens, setSelectedMint }) => {
  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      aria-labelledby="parent-modal-title"
      aria-describedby="parent-modal-description"
      className="border-none"
    >
      <div className="mx-auto mt-40 rounded-xl bg-[#1C2023] w-[400px] max-w-[90%] h-[500px] p-4">
        <div className="flex flex-row justify-between">
          <Typography className="font-aeonik font-[700] text-2xl inline">Select token</Typography>
          <div className="cursor-pointer" onClick={handleClose}>
            <Close />
          </div>
        </div>
        <div className="flex flex-col gap-1 mt-3">
          {supportedTokens.map((token) => {
            return (
              <a
                  key={token.mint.toBase58()}
                  onClick={() => {
                  setSelectedMint(token.mint);
                  handleClose();
                }}
              >
                <div
                  className="flex flex-row w-full gap-4 p-2 rounded-lg hover:bg-gray-700 cursor-pointer"
                >
                  <Image src={token.iconUrl} alt="token logo" height={35} width={35} />

                  <Typography className="flex h-full font-aeonik font-[500] text-2xl items-center">
                    {token.symbol}
                  </Typography>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};
