import { Typography, Modal } from "@mui/material";
import { Dispatch, FC, SetStateAction } from "react";
import { Close } from "@mui/icons-material";
import Image from "next/image";
import { PublicKey } from "@solana/web3.js";
import { numeralFormatter } from "@mrgnlabs/mrgn-common";
import { TokenDataMap } from "~/store/lstStore";

interface StakingModalProps {
  isOpen: boolean;
  handleClose: () => void;
  setSelectedMint: Dispatch<SetStateAction<PublicKey>>;
  tokenDataMap: TokenDataMap;
}

export const StakingModal: FC<StakingModalProps> = ({ isOpen, handleClose, tokenDataMap, setSelectedMint }) => {
  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      aria-labelledby="parent-modal-title"
      aria-describedby="parent-modal-description"
      className="border-none"
    >
      <div className="flex flex-col mx-auto mt-40 rounded-xl bg-[#1C2023] w-[400px] max-w-[90%] h-[500px] p-4">
        <div className="flex flex-row justify-between">
          <Typography className="font-aeonik font-[700] text-2xl inline">Select token</Typography>
          <div className="cursor-pointer" onClick={handleClose}>
            <Close />
          </div>
        </div>
        <div className="flex flex-col h-full gap-1 mt-5 overflow-y-scroll">
          {[...tokenDataMap.values()]
            .sort((a, b) => Number(b.balance) * Number(b.price) - Number(a.balance) * Number(a.price))
            .map((token) => {
              const usdValue = token.balance * token.price;
              return (
                <a
                  key={token.address}
                  onClick={() => {
                    setSelectedMint(new PublicKey(token.address));
                    handleClose();
                  }}
                >
                  <div className="flex flex-row w-full justify-between font-aeonik font-[400] text-xl items-center gap-4 p-2 rounded-lg hover:bg-gray-700 cursor-pointer">
                    <div className="flex flex-row items-center gap-2">
                      <Image src={token.iconUrl} alt="token logo" height={35} width={35} />
                      <Typography>{token.symbol}</Typography>
                    </div>
                    <div className="flex flex-row items-center w">
                      {token.balance > 0 && (
                        <>
                          <Typography>{token.balance < 0.01 ? "< 0.01" : numeralFormatter(token.balance)}</Typography>
                          <Typography className="flex justify-end min-w-[75px]">({usdValue < 0.01 ? "< $0.01" : `$${numeralFormatter(usdValue)}`})</Typography>
                        </>
                      )}
                    </div>
                  </div>
                </a>
              );
            })}
        </div>
      </div>
    </Modal>
  );
};
