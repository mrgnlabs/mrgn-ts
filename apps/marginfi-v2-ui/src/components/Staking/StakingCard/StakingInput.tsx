import { FC, useState } from "react";
import { Typography, InputBase } from "@mui/material";
import { ArrowDropDown } from "@mui/icons-material";
import Image from "next/image";

import { StakingModal } from "./StakingModal";

interface StakingInputProps {}

export const StakingInput: FC<StakingInputProps> = ({}) => {
  return (
    <InputBase
      startAdornment={<DropDownButton />}
      className="text-white bg-[#0F1111] text-3xl p-3 rounded-xl"
      type="number"
      sx={{
        input: { textAlign: "right", MozAppearance: "textfield" },
        "input::-webkit-inner-spin-button": { WebkitAppearance: "none", margin: 0 },
      }}
    ></InputBase>
  );
};

interface DropDownButtonProps {}

const DropDownButton: FC<DropDownButtonProps> = ({}) => {
  const selectedTokenUrl = "info_icon.png"; // link up
  const token = "SOL"; // link up
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  return (
    <>
      <div
        onClick={() => {}}
        className="w-[250px] h-[45px] flex flex-row justify-between py-2 px-4 text-white bg-[#303030] rounded-lg cursor-pointer"
      >
        <div className="flex flex-row gap-3">
          <div className="m-auto">
            <Image src={`/${selectedTokenUrl}`} alt="token logo" height={24} width={24} />
          </div>
          <Typography className="font-aeonik font-[700] text-lg leading-none my-auto">{token}</Typography>
        </div>
        <ArrowDropDown />
      </div>
      <StakingModal isOpen={isModalOpen} handleClose={() => setIsModalOpen(false)} />
    </>
  );
};
