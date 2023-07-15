import React, { FC, useMemo } from "react";
import { Card, Table, TableBody, TableContainer, TableHead, TableCell, Typography } from "@mui/material";
import { useTokenAccounts, useUserAccounts } from "~/context";
import UserPositionRow from "./UserPositionRow";
import Tooltip, { TooltipProps, tooltipClasses } from "@mui/material/Tooltip";
import { styled } from "@mui/material/styles";
import Image from 'next/image';
import Link from 'next/link';

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

const UserPositions: FC = () => {
  const { selectedAccount, activeBankInfos, reload } = useUserAccounts();
  const { tokenAccountMap } = useTokenAccounts();

  const { lendPositions, borrowPositions } = useMemo(
    () => ({
      lendPositions: activeBankInfos.filter((bankInfo) => bankInfo.position.isLending),
      borrowPositions: activeBankInfos.filter((bankInfo) => !bankInfo.position.isLending),
    }),
    [activeBankInfos]
  );

  const { lentAssetInfos, borrowedAssetInfos } = useMemo(
    () => ({
      lentAssetInfos: lendPositions.map((bankInfo) => ({
        bankInfo,
        tokenBalance: tokenAccountMap.get(bankInfo.bank.mint.toBase58())?.balance || 0,
      })),
      borrowedAssetInfos: borrowPositions.map((bankInfo) => ({
        bankInfo,
        tokenBalance: tokenAccountMap.get(bankInfo.bank.mint.toBase58())?.balance || 0,
      })),
    }),
    [borrowPositions, lendPositions, tokenAccountMap]
  );

  return (
    <>
      {lentAssetInfos.length > 0 && selectedAccount && (
        <Card elevation={0} className="bg-transparent w-full p-0 grid">
          <div className="font-aeonik font-normal text-2xl my-0 lg:mt-2 mb-[-20px] text-white">Lending</div>
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
                  className="hidden md:table-cell border-none"
                  style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
                  align="right"
                >
                  <Typography className="text-[#A1A1A1] font-aeonik font-[300] text-sm flex gap-1">
                    Lending
                  </Typography>
                </TableCell>
                <TableCell
                  className="hidden md:table-cell border-none"
                  style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
                  align="right"
                >
                  <Typography className="text-[#A1A1A1] font-aeonik font-[300] text-sm flex gap-1">
                    Wtd
                    <div className="self-center">
                      <HtmlTooltip
                        title={
                          <React.Fragment>
                            <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                              Weighted values
                            </Typography>
                            <div className="flex flex-col gap-2 pb-2">
                              For risk purposes, token values are adjusted by oracle price bias and risk weights.
                            </div>
                            <div className="flex flex-col gap-2 pb-2">
                              Weighted prices used in risk calculations and are relevant to your health factor.
                            </div>
                            <Link href="https://t.me/mrgncommunity"><u>Learn more here.</u></Link>
                          </React.Fragment>
                        }
                        placement="top"
                      >
                        <Image src="/info_icon.png" alt="info" height={16} width={16} />
                      </HtmlTooltip>
                    </div>
                  </Typography>
                </TableCell>
                <TableCell
                  className="hidden md:table-cell border-none"
                  style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
                  align="right"
                >
                  <Typography className="text-[#A1A1A1] font-aeonik font-[300] text-sm flex gap-1">
                    USD
                    <div className="self-center">
                      <HtmlTooltip
                        title={
                          <React.Fragment>
                            <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                              USD Values
                            </Typography>
                            <div className="flex flex-col gap-2 pb-2">
                              Unadjusted USD values are based on oracle mid prices - or the best estimate the oracle has of average token price.
                            </div>
                            <div className="flex flex-col gap-2 pb-2">
                              Unadjusted USD values are not used in risk calculations. Values with price bias are used because they are more conservative, and can control for oracle inaccuracies.
                            </div>
                            <Link href="https://t.me/mrgncommunity"><u>Learn more here.</u></Link>
                          </React.Fragment>
                        }
                        placement="top"
                      >
                        <Image src="/info_icon.png" alt="info" height={16} width={16} />
                      </HtmlTooltip>
                    </div>
                  </Typography>
                </TableCell>
                <TableCell className="border-none"></TableCell>
                <TableCell className="border-none"></TableCell>
              </TableHead>
              <TableBody>
                {lentAssetInfos.map(({ bankInfo }, index) => (
                  <UserPositionRow
                    key={index}
                    activeBankInfo={bankInfo}
                    marginfiAccount={selectedAccount}
                    reloadPositions={reload}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
      <div>
        {borrowedAssetInfos.length > 0 && selectedAccount && (
          <Card elevation={0} className="bg-transparent w-full p-0 grid">
            <div className="font-aeonik font-normal text-2xl my-0 lg:mt-2 mb-[-20px] text-white">Borrowing</div>
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
                    className="hidden md:table-cell border-none"
                    style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
                    align="right"
                  >
                    <Typography className="text-[#A1A1A1] font-aeonik font-[300] text-sm flex gap-1">
                      Borrowing
                    </Typography>
                  </TableCell>
                  <TableCell
                    className="hidden md:table-cell border-none"
                    style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
                    align="right"
                  >
                    <Typography className="text-[#A1A1A1] font-aeonik font-[300] text-sm flex gap-1">
                      Wtd
                      <div className="self-center">
                        <HtmlTooltip
                          title={
                            <React.Fragment>
                              <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                                Weighted values
                              </Typography>
                              <div className="flex flex-col gap-2 pb-2">
                                For risk purposes, token values are adjusted by oracle price bias and risk weights.
                              </div>
                              <div className="flex flex-col gap-2 pb-2">
                                Weighted prices used in risk calculations and are relevant to your health factor.
                              </div>
                              <Link href="https://t.me/mrgncommunity"><u>Learn more here.</u></Link>
                            </React.Fragment>
                          }
                          placement="top"
                        >
                          <Image src="/info_icon.png" alt="info" height={16} width={16} />
                        </HtmlTooltip>
                      </div>
                    </Typography>
                  </TableCell>
                  <TableCell
                    className="hidden md:table-cell border-none"
                    style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
                    align="right"
                  >
                    <Typography className="text-[#A1A1A1] font-aeonik font-[300] text-sm flex gap-1">
                      USD
                      <div className="self-center">
                        <HtmlTooltip
                          title={
                            <React.Fragment>
                              <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                                USD Values
                              </Typography>
                              <div className="flex flex-col gap-2 pb-2">
                                Unadjusted USD values are based on oracle mid prices - or the best estimate the oracle has of average token price.
                              </div>
                              <div className="flex flex-col gap-2 pb-2">
                                Unadjusted USD values are not used in risk calculations. Values with price bias are used because they are more conservative, and can control for oracle inaccuracies.
                              </div>
                              <Link href="https://t.me/mrgncommunity"><u>Learn more here.</u></Link>
                            </React.Fragment>
                          }
                          placement="top"
                        >
                          <Image src="/info_icon.png" alt="info" height={16} width={16} />
                        </HtmlTooltip>
                      </div>
                    </Typography>
                  </TableCell>
                  <TableCell className="border-none"></TableCell>
                  <TableCell className="border-none"></TableCell>
                </TableHead>
                <TableBody>
                  {borrowedAssetInfos.map(({ bankInfo }, index) => (
                    <UserPositionRow
                      key={index}
                      activeBankInfo={bankInfo}
                      marginfiAccount={selectedAccount}
                      reloadPositions={reload}
                    />
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        )}
      </div>
    </>
  );
};

export { UserPositions };
