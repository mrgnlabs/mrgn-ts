import Image from "next/image";
import React, { FC, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, Skeleton, Table, TableHead, TableBody, TableContainer, TableRow, TableCell } from "@mui/material";
import { styled } from "@mui/material/styles";
import Tooltip, { TooltipProps, tooltipClasses } from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useBanks, useProgram, useUserAccounts } from "~/context";
import { BorrowLendToggle } from "./BorrowLendToggle";
import AssetRow from "./AssetRow";

const HtmlTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: "rgb(227, 227, 227)",
    color: "rgba(0, 0, 0, 0.87)",
    maxWidth: 220,
    fontSize: theme.typography.pxToRem(12),
    border: "1px solid #dadde9",
  },
}));

const AssetsList: FC = () => {
  const [isInLendingMode, setIsInLendingMode] = useState(true);
  const { mfiClient } = useProgram();
  const { reload } = useBanks();
  const { extendedBankInfos, selectedAccount, nativeSolBalance } = useUserAccounts();
  const wallet = useWallet();

  // Hack required to circumvent rehydration error
  const [hasMounted, setHasMounted] = React.useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);
  if (!hasMounted) {
    return null;
  }

  return (
    <>
      <div className="col-span-full">
        <BorrowLendToggle isInLendingMode={isInLendingMode} setIsInLendingMode={setIsInLendingMode} />
      </div>

      <div className="col-span-full">
        <Card elevation={0} className="bg-[rgba(0,0,0,0)] w-full">
          <TableContainer>
            <Table
              className="table-fixed"
              style={{
                borderCollapse: "separate",
                borderSpacing: "0px 8px",
              }}
            >
              <TableHead>
                <TableCell className="border-none"></TableCell>
                <TableCell
                  className="text-[#A1A1A1] text-sm border-none px-2 hidden lg:table-cell"
                  style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
                  align="right"
                >
                  <div className="h-full w-full flex justify-end items-center gap-2">
                    Price
                    <HtmlTooltip
                      title={
                        <React.Fragment>
                          <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                            Realtime prices
                          </Typography>
                          Powered by Pyth and Switchboard.
                        </React.Fragment>
                      }
                      placement="top"
                    >
                      <Image src="/info_icon.png" alt="info" height={16} width={16} />
                    </HtmlTooltip>
                  </div>
                </TableCell>
                <TableCell
                  className="text-[#A1A1A1] text-sm border-none px-2 hidden md:table-cell"
                  style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
                  align="right"
                >
                  <div className="h-full w-full flex justify-end items-center gap-2">
                    {isInLendingMode ? "APY" : "APR"}
                    <HtmlTooltip
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
                    </HtmlTooltip>
                  </div>
                </TableCell>
                <TableCell
                  className="text-[#A1A1A1] text-sm border-none px-2 hidden md:table-cell"
                  style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
                  align="right"
                >
                  <div className="h-full w-full flex justify-end items-center gap-2">
                    {isInLendingMode ? "Weight" : "LTV"}
                    <HtmlTooltip
                      title={
                        <React.Fragment>
                          <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                            {isInLendingMode ? "Weight" : "LTV"}
                          </Typography>
                          {isInLendingMode
                            ? "How much your assets count for collateral, relative to their USD value. The higher the weight, the more collateral you can borrow against it."
                            : "How much you can borrow against the marginfi value of your collateral. The higher the LTV, the more you can borrow against your collateral."}
                        </React.Fragment>
                      }
                      placement="top"
                    >
                      <Image src="/info_icon.png" alt="info" height={16} width={16} />
                    </HtmlTooltip>
                  </div>
                </TableCell>
                <TableCell
                  className="text-[#A1A1A1] text-sm border-none px-2 hidden lg:table-cell"
                  style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
                  align="right"
                >
                  <div className="h-full w-full flex justify-end items-center gap-2">
                    {isInLendingMode ? "Deposits" : "Available"}
                    <HtmlTooltip
                      title={
                        <React.Fragment>
                          <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                            {isInLendingMode ? "Total deposits" : "Total available"}
                          </Typography>
                          {isInLendingMode
                            ? "Total marginfi deposits for each asset. Everything is denominated in native tokens."
                            : "The amount of tokens available to borrow for each asset."}
                        </React.Fragment>
                      }
                      placement="top"
                    >
                      <Image src="/info_icon.png" alt="info" height={16} width={16} />
                    </HtmlTooltip>
                  </div>
                </TableCell>
                <TableCell
                  className="text-[#A1A1A1] text-sm border-none px-2 hidden lg:table-cell"
                  style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
                  align="right"
                >
                  <div className="h-full w-full flex justify-end items-center gap-2">
                    Wallet Balance
                    {/* <Image src="/info_icon.png" alt="info" height={16} width={16} /> */}
                  </div>
                </TableCell>
                <TableCell className="border-none"></TableCell>
                <TableCell className="border-none"></TableCell>
              </TableHead>
              <TableBody>
                {extendedBankInfos.length > 0 ? (
                  extendedBankInfos
                    .sort((a, b) => b.totalPoolDeposits * b.tokenPrice - a.totalPoolDeposits * a.tokenPrice)
                    .map((bankInfo) => (
                      <AssetRow
                        key={bankInfo.tokenName}
                        nativeSolBalance={nativeSolBalance}
                        bankInfo={bankInfo}
                        isInLendingMode={isInLendingMode}
                        isConnected={wallet.connected}
                        marginfiAccount={selectedAccount}
                        marginfiClient={mfiClient}
                        reloadBanks={reload}
                      />
                    ))
                ) : (
                  <LoadingAssets />
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </div>
    </>
  );
};

const LOADING_ASSETS = 3;

const LoadingAssets = () => (
  <>
    {[...new Array(LOADING_ASSETS)].map((_, index) => (
      <TableRow key={index}>
        <Skeleton
          component="td"
          sx={{ bgcolor: "grey.900" }}
          variant="rectangular"
          animation="wave"
          className="flex justify-between items-center h-[78px] p-0 px-2 sm:p-2 lg:p-4 border-solid border-[#1C2125] border rounded-xl gap-2 lg:gap-4"
        />
      </TableRow>
    ))}
  </>
);

export { AssetsList };
