import { TableCell, TableRow, Typography } from "@mui/material";
import React from "react";
import Image from "next/image";
import { useUserProfileStore } from "~/store";

import { MrgnTooltip } from "../MrgnTooltip";

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
          <MrgnTooltip
            title={
              <React.Fragment>
                <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                  Realtime prices
                </Typography>
                <span style={{ fontFamily: "Aeonik Pro", fontWeight: 400 }}>Powered by Pyth and Switchboard.</span>
              </React.Fragment>
            }
            placement="top"
          >
            <Image src="/info_icon.png" alt="info" height={16} width={16} />
          </MrgnTooltip>
        </div>
      </TableCell>
      <TableCell
        className="text-[#A1A1A1] text-base border-none px-2 hidden md:table-cell"
        style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
        align="right"
      >
        <div className="h-full w-full flex justify-end items-center gap-2">
          {isInLendingMode ? "APY" : "APR"}
          <MrgnTooltip
            title={
              <React.Fragment>
                <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                  {isInLendingMode ? "APY" : "APR"}
                </Typography>
                <span style={{ fontFamily: "Aeonik Pro", fontWeight: 400 }}>
                  {isInLendingMode
                    ? "What you'll earn on deposits over a year. This includes compounding. All marginfi deposits are compounded hourly."
                    : "What you'll pay for your borrows, or the price of a loan. This does not include compounding. All marginfi borrows are compounded hourly."}
                </span>
              </React.Fragment>
            }
            placement="top"
          >
            <Image src="/info_icon.png" alt="info" height={16} width={16} />
          </MrgnTooltip>
        </div>
      </TableCell>
      <TableCell
        className="text-[#A1A1A1] text-base border-none px-2 hidden md:table-cell"
        style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
        align="right"
      >
        <div className="h-full w-full flex justify-end items-center gap-2">
          {isInLendingMode ? "Weight" : "LTV"}
          <MrgnTooltip
            title={
              <React.Fragment>
                <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                  {isInLendingMode ? "Weight" : "LTV"}
                </Typography>
                <span style={{ fontFamily: "Aeonik Pro", fontWeight: 400 }}>
                  {isInLendingMode
                    ? "How much your assets count for collateral, relative to their USD value. The higher the weight, the more collateral you can borrow against it."
                    : "How much you can borrow against your free collateral. The higher the LTV, the more you can borrow against your free collateral."}
                </span>
              </React.Fragment>
            }
            placement="top"
          >
            <Image src="/info_icon.png" alt="info" height={16} width={16} />
          </MrgnTooltip>
        </div>
      </TableCell>
      <TableCell
        className="text-[#A1A1A1] text-base border-none px-2 hidden lg:table-cell"
        style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
        align="right"
      >
        <div className="h-full w-full flex justify-end items-center gap-2">
          {isInLendingMode ? "Deposits" : "Available"}
          <MrgnTooltip
            title={
              <React.Fragment>
                <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                  {isInLendingMode ? "Total deposits" : "Total available"}
                </Typography>
                <span style={{ fontFamily: "Aeonik Pro", fontWeight: 400 }}>
                  {isInLendingMode
                    ? "Total marginfi deposits for each asset. Everything is denominated in native tokens."
                    : "The amount of tokens available to borrow for each asset. Calculated as the minimum of the asset's borrow limit and available liquidity that has not yet been borrowed."}
                </span>
              </React.Fragment>
            }
            placement="top"
          >
            <Image src="/info_icon.png" alt="info" height={16} width={16} />
          </MrgnTooltip>
        </div>
      </TableCell>

      <TableCell
        className="text-[#A1A1A1] text-base border-none px-2 hidden xl:table-cell"
        style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
        align="right"
      >
        <div className="h-full w-full flex justify-end items-center gap-2">
          Global limit
          <MrgnTooltip
            title={
              <React.Fragment>
                <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                  {isInLendingMode ? "Global deposit cap" : "Global borrow cap"}
                </Typography>
                Each marginfi pool has global deposit and borrow limits, also known as caps. This is the total amount
                that all users combined can deposit or borrow of a given token.
              </React.Fragment>
            }
            placement="top"
          >
            <Image src="/info_icon.png" alt="info" height={16} width={16} />
          </MrgnTooltip>
        </div>
      </TableCell>
      <TableCell
        className="text-[#A1A1A1] text-base border-none px-2 hidden xl:table-cell"
        style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
        align="right"
      >
        <div className="h-full w-full flex justify-end items-center gap-2">
          Utilization
          <MrgnTooltip
            title={
              <React.Fragment>
                <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                  Pool utilization
                </Typography>
                What percentage of supplied tokens have been borrowed. This helps determine interest rates. This is not
                based on the global pool limits, which can limit utilization.
              </React.Fragment>
            }
            placement="top"
          >
            <Image src="/info_icon.png" alt="info" height={16} width={16} />
          </MrgnTooltip>
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
