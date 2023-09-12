import { FC } from "react";
import { Typography } from "@mui/material";

import { StakingInput } from "./StakingInput";
import { WalletIcon } from "./WalletIcon";
import { PrimaryButton } from "./PrimaryButton";

interface StakingCardProps {}

export const StakingCard: FC<StakingCardProps> = ({}) => {
  return (
    <>
      <div className="relative flex flex-col gap-2 rounded-xl bg-[#1C2023] px-8 py-6 max-w-[480px] w-full">
        <div className="flex flex-row justify-between w-full">
          <Typography className="font-aeonik font-[400] text-lg">Deposit</Typography>
          <div className="flex flex-row gap-2 my-auto">
            <div>
              <WalletIcon />
            </div>
            <Typography className="font-aeonik font-[400] text-sm my-auto">123</Typography>
            <a className="font-aeonik font-[700] text-base cursor-pointer" onClick={() => {}}>
              MAX
            </a>
          </div>
        </div>
        <StakingInput />
        <div className="flex flex-row justify-between w-full my-auto pt-2">
          <Typography className="font-aeonik font-[400] text-lg">You will Receive</Typography>
          <Typography className="font-aeonik font-[700] text-2xl text-[#75BA80]">314.27 $LST</Typography>
        </div>
        <div className="py-7">
          <PrimaryButton>Mint</PrimaryButton>
        </div>
        <div className="flex flex-row justify-between w-full my-auto">
          <Typography className="font-aeonik font-[400] text-base">Current price</Typography>
          <Typography className="font-aeonik font-[700] text-lg">1 $LST = 1.13 SOL</Typography>
        </div>
        <div className="flex flex-row justify-between w-full my-auto">
          <Typography className="font-aeonik font-[400] text-base">Fees</Typography>
          <Typography className="font-aeonik font-[700] text-lg">0%</Typography>
        </div>
      </div>
    </>
  );
};
