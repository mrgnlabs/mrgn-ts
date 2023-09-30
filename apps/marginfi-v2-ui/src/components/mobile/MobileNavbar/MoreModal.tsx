import { Close } from "@mui/icons-material";
import { Link, Modal, Slide, Typography } from "@mui/material";
import Image from "next/image";
import { FC } from "react";

interface MoreModalProps {
  isOpen: boolean;
  handleClose: () => void;
}

export const MoreModal: FC<MoreModalProps> = ({ isOpen, handleClose }) => {
  return (
    <Modal open={isOpen} onClose={handleClose} className="border-none">
      <Slide direction="up" in={isOpen} mountOnEnter unmountOnExit>
        <div className="absolute top-0 left-0 w-full h-[calc(100%)] bg-[#0F1111] p-4">
          <div className="flex flex-row justify-between mb-3">
            <Link
              href={"https://app.marginfi.com"}
              className="h-[35.025px] w-[31.0125px] min-h-[35.025px] min-w-[31.0125px] flex justify-center items-center"
            >
              <Image src="/marginfi_logo.png" alt="marginfi logo" height={35.025} width={31.0125} />
            </Link>
            <div className="cursor-pointer" onClick={handleClose}>
              <Close />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Link href={"/"} className="hover-underline-animation">
              <Typography className="font-aeonik font-[400] text-lg">Lend</Typography>
            </Link>
            <Link href={"/stake"} className="hover-underline-animation">
              <Typography className="font-aeonik font-[400] text-lg">Stake</Typography>
            </Link>
            <Link href={"/swap"} className="hover-underline-animation">
              <Typography className="font-aeonik font-[400] text-lg">Swap</Typography>
            </Link>
            <Link href={"/portfolio"} className="hover-underline-animation">
              <Typography className="font-aeonik font-[400] text-lg">Portfolio</Typography>
            </Link>
          </div>
        </div>
      </Slide>
    </Modal>
  );
};
