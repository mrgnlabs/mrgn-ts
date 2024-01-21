import { TableCell, TableRow, Typography } from "@mui/material";
import React from "react";
import Image from "next/image";
import { useUserProfileStore } from "~/store";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";

interface AssetRowHeaderProps {
  isInLendingMode: boolean;
  isGlobalPool: boolean;
}

export const AssetRowHeader: React.FC<AssetRowHeaderProps> = ({ isGlobalPool, isInLendingMode }) => {
  const [lendZoomLevel] = useUserProfileStore((state) => [state.lendZoomLevel]);

  return (
    <TableRow>
      <TableCell
        className="text-[#A1A1A1] text-base border-none px-2 table-cell text-left"
        style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
      >
        <div className="h-full w-full flex items-center">Asset</div>
      </TableCell>
      <TableCell
        className="text-[#A1A1A1] text-base border-none px-2 table-cell"
        style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
        align="right"
      >
        <div className="h-full w-full flex justify-end items-center gap-2">
          Price
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Image src="/info_icon.png" alt="info" height={16} width={16} />
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex flex-col items-start gap-1 text-left">
                  <h4 className="text-base">Realtime prices</h4>
                  <span style={{ fontFamily: "Aeonik Pro", fontWeight: 400 }}>Powered by Pyth and Switchboard.</span>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </TableCell>
      <TableCell
        className="text-[#A1A1A1] text-base border-none px-2"
        style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
        align="right"
      >
        <div className="h-full w-full flex justify-end items-center gap-2">
          {isInLendingMode ? "APY" : "APR"}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Image src="/info_icon.png" alt="info" height={16} width={16} />
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex flex-col items-start gap-1 text-left">
                  <h4 className="text-base">{isInLendingMode ? "APY" : "APR"}</h4>
                  <span style={{ fontFamily: "Aeonik Pro", fontWeight: 400 }}>
                    {isInLendingMode
                      ? "What you'll earn on deposits over a year. This includes compounding. All marginfi deposits are compounded hourly."
                      : "What you'll pay for your borrows, or the price of a loan. This does not include compounding. All marginfi borrows are compounded hourly."}
                  </span>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </TableCell>
      <TableCell
        className="text-[#A1A1A1] text-base border-none px-2"
        style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
        align="right"
      >
        <div className="h-full w-full flex justify-end items-center gap-2">
          {isInLendingMode ? "Weight" : "LTV"}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Image src="/info_icon.png" alt="info" height={16} width={16} />
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex flex-col items-start gap-1 text-left">
                  <h4 className="text-base">{isInLendingMode ? "Weight" : "LTV"}</h4>
                  <span style={{ fontFamily: "Aeonik Pro", fontWeight: 400 }}>
                    {isInLendingMode
                      ? "How much your assets count for collateral, relative to their USD value. The higher the weight, the more collateral you can borrow against it."
                      : "How much you can borrow against your free collateral. The higher the LTV, the more you can borrow against your free collateral."}
                  </span>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </TableCell>
      <TableCell
        className="text-[#A1A1A1] text-base border-none px-2"
        style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
        align="right"
      >
        <div className="h-full w-full flex justify-end items-center gap-2">
          {isInLendingMode ? "Deposits" : "Available"}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Image src="/info_icon.png" alt="info" height={16} width={16} />
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex flex-col items-start gap-1 text-left">
                  <h4 className="text-base">{isInLendingMode ? "Total deposits" : "Total available"}</h4>
                  <span style={{ fontFamily: "Aeonik Pro", fontWeight: 400 }}>
                    {isInLendingMode
                      ? "Total marginfi deposits for each asset. Everything is denominated in native tokens."
                      : "The amount of tokens available to borrow for each asset. Calculated as the minimum of the asset's borrow limit and available liquidity that has not yet been borrowed."}
                  </span>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </TableCell>

      <TableCell
        className="text-[#A1A1A1] text-base border-none px-2"
        style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
        align="right"
      >
        <div className="h-full w-full flex justify-end items-center gap-2">
          {isInLendingMode ? "Global limit" : "Total Borrows"}
          {isInLendingMode && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Image src="/info_icon.png" alt="info" height={16} width={16} />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="flex flex-col items-start gap-1 text-left">
                    <h4 className="text-base">Global deposit cap</h4>
                    Each marginfi pool has global deposit and borrow limits, also known as caps. This is the total
                    amount that all users combined can deposit or borrow of a given token.
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </TableCell>
      <TableCell
        className="text-[#A1A1A1] text-base border-none px-2"
        style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
        align="right"
      >
        <div className="h-full w-full flex justify-end items-center gap-2">
          Utilization
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Image src="/info_icon.png" alt="info" height={16} width={16} />
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex flex-col items-start gap-1 text-left">
                  <h4 className="text-base">Pool utilization</h4>
                  What percentage of supplied tokens have been borrowed. This helps determine interest rates. This is
                  not based on the global pool limits, which can limit utilization.
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </TableCell>

      <TableCell
        className="text-[#A1A1A1] text-base border-none px-2 table-cell"
        style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
        align="right"
      >
        <div className="h-full w-full flex justify-end items-center gap-2">Wallet Amt.</div>
      </TableCell>
      {/* <TableCell className="border-none"></TableCell> */}
      <TableCell className="border-none "></TableCell>
    </TableRow>
  );
};
