import { TableCell } from "@mui/material";
import { FC } from "react";
import Image from "next/image";
import { ActionType } from "~/types";
import { AssetRowAction } from "./AssetRowAction";
import { AssetRowInputBox } from "./AssetRowInputBox";

interface AssetRowHeader {
  assetName: string;
  icon?: string;
  usdPrice: string;
  tableCellStyling: string;
}

interface AssetRowEnder {
  assetName: string;
  icon?: string;
  tableCellStyling: string;
  actionButtonOnClick: () => void;
  currentAction: ActionType;
  borrowOrLendAmount: number;
  setBorrowOrLendAmount:  (amount: number) => void;
  maxAmount: number;
  maxDecimals: number;
  isConnected: boolean;
}

// @todo these types of styling attributes need to be organized better
const assetBorders = {
  "SOL": "#9945FF",
  "USDC": "#2775CA",
}

const AssetRowHeader: FC<AssetRowHeader> = ({ assetName, icon, usdPrice, tableCellStyling }) => (
  <div
    className={
      `text-white h-full w-full px-1 py-1 sm:py-0 lg:pr-0 flex flex-col xl:flex-row justify-center lg:justify-evenly items-center gap-0 sm:gap-1 rounded-md ${tableCellStyling} border-hidden sm:border-solid`
    }
    style={{
      border: `solid ${assetBorders[assetName]} 1px`
    }}
  >
    <div
      className="flex justify-start items-center min-w-fit"
    >
      {
        icon && 
          <Image src={icon} alt={assetName} height={25} width={25} className="mr-2 max-w-fit" />
      }
      <div>
        <div>{assetName}</div>
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

const AssetRowEnder: FC<AssetRowEnder> = ({ assetName, icon, tableCellStyling, actionButtonOnClick, currentAction, borrowOrLendAmount, setBorrowOrLendAmount, maxAmount, maxDecimals, isConnected }) => (
  <div
    className={`text-white h-full w-full p-1 flex justify-between items-center gap-1 rounded-md ${tableCellStyling}`}
    style={{
      border: `solid ${assetBorders[assetName]} 1px`
    }}
  >
    {icon && <Image src={icon} alt={assetName} height={25} width={25} className="mx-1 hidden xl:flex" />}
    {
      isConnected &&
      <AssetRowInputBox
        value={borrowOrLendAmount}
        setValue={setBorrowOrLendAmount}
        maxValue={maxAmount}
        maxDecimals={maxDecimals}
      />
    }
    <AssetRowAction onClick={actionButtonOnClick}>{currentAction}</AssetRowAction>
  </div>
);

export { AssetRowHeader, AssetRowEnder };
