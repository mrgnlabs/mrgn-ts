import { TableCell } from "@mui/material";
import { FC } from "react";
import Image from "next/image";
import { percentFormatter } from "~/utils/formatters";

interface AssetRowHeader {
  assetName: string;
  apy: number;
  icon?: string;
  isInLendingMode: boolean;
}

const AssetRowHeader: FC<AssetRowHeader> = ({ assetName, apy, icon, isInLendingMode }) => (
  <TableCell
    className="text-white h-full w-full border-hidden px-0.5 lg:pr-0 flex justify-center sm:justify-start items-center max-w-[250px] gap-1 min-w-fit"
    style={{
      border: 'solid red 1px',
    }}
  >
    <div
      className="flex justify-start items-center min-w-fit"
    >
      {icon && <Image src={icon} alt={assetName} height={25} width={25} className="mr-2" />}
      <div>
        <div className="font-aeonik">{assetName}</div>
      </div>
    </div>
    <div
      className="font-aeonik px-1 text-sm text-[#868E95] hidden lg:flex"
    >
      Current APY
    </div>
    <div
      className={`font-aeonik flex justify-center items-center px-2 ${
        isInLendingMode ? "text-[#3AFF6C]" : "text-[#EEB9BA]"
      } ${isInLendingMode ? "bg-[#3aff6c1f]" : "bg-[#db383e4d]"} rounded-xl text-sm`}
    >
      {percentFormatter.format(apy)}
    </div>
  </TableCell>
);

export { AssetRowHeader };
