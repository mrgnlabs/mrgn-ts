import { TableCell } from "@mui/material";
import { FC } from "react";
import Image from "next/image";
import { ProductType } from "~/types";

interface AssetRowHeader {
  assetName: string;
  icon?: string;
  usdPrice: string;
  tableCellStyling: string;
}

// @todo these types of styling attributes need to be organized better
const assetBorders = {
  "SOL": "#9945FF",
  "USDC": "#2775CA",
}

const AssetRowHeader: FC<AssetRowHeader> = ({ assetName, icon, usdPrice, tableCellStyling }) => (
  <div
    className={`text-white h-full w-full px-0.5 lg:pr-0 flex justify-center sm:justify-evenly items-center gap-1 rounded-md ${tableCellStyling}`}
    style={{
      border: `solid ${assetBorders[assetName]} 1px`
    }}
  >
    <div className="flex justify-start items-center min-w-fit">
      {icon && <Image src={icon} alt={assetName} height={25} width={25} className="mr-2" />}
      <div>
        <div className="font-aeonik">{assetName}</div>
      </div>
    </div>
    <div
      className="flex justify-center items-center px-2 rounded-xl text-xs text-[#868E95]"
      style={{
        backgroundColor: "rgba(113, 119, 126, 0.3)",
      }}
    >
      {usdPrice}
    </div>
  </div>
);

export { AssetRowHeader };
