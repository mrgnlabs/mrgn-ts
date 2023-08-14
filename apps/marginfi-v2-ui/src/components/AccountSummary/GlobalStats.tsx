import { Typography, Skeleton } from "@mui/material";
import Image from "next/image";
import Link from "next/link";
import { FC } from "react";
import { numeralFormatter } from "~/utils/formatters";
import { MrgnTooltip } from "../Tooltip";

interface GlobalStatsProps {
  globalDeposits: number;
  globalBorrows: number;
  globalTVL: number;
  globalPoints: number | null;
}

const GlobalStats: FC<GlobalStatsProps> = ({ globalBorrows, globalDeposits, globalPoints, globalTVL }) => {
  return (
    <div className="h-full rounded-xl font-[500] p-[10px]">
      <span className="w-full flex justify-start text-xl">Global stats</span>
      <div className="overflow-auto">
        <div className="flex gap-4 w-full min-w-[650px] 2xl:min-w-0 mt-[20px]">
          <div className="h-full min-w-[110px]">
            <div>
              <Typography color="#868E95" className="font-aeonik font-[300] text-xs flex gap-1" gutterBottom>
                Global Supplied
                <div className="self-center">
                  <MrgnTooltip
                    title={
                      <>
                        <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                          Global Supplied
                        </Typography>
                        Total value supplied across all assets in the marginfi protocol.
                      </>
                    }
                    placement="top"
                  >
                    <Image src="/info_icon.png" alt="info" height={16} width={16} />
                  </MrgnTooltip>
                </div>
              </Typography>
              <Typography color="#fff" className="font-aeonik font-[500] text-xl" component="div">
                {globalDeposits ? (
                  `$${numeralFormatter(globalDeposits)}`
                ) : (
                  <Skeleton variant="rectangular" animation="wave" className="w-1/3 rounded-md top-[4px]" />
                )}
              </Typography>
            </div>
          </div>
          <DividerLine />
          <div className="h-full min-w-[110px]">
            <div>
              <Typography color="#868E95" className="font-aeonik font-[300] text-xs flex gap-1" gutterBottom>
                Global Borrowed
                <div className="self-center">
                  <MrgnTooltip
                    title={
                      <>
                        <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                          Global Borrowed
                        </Typography>
                        Total value borrowed across all assets in the marginfi protocol.
                      </>
                    }
                    placement="top"
                  >
                    <Image src="/info_icon.png" alt="info" height={16} width={16} />
                  </MrgnTooltip>
                </div>
              </Typography>
              <Typography color="#fff" className="font-aeonik font-[500] text-xl" component="div">
                {globalBorrows ? (
                  `$${numeralFormatter(globalBorrows)}`
                ) : (
                  <Skeleton variant="rectangular" animation="wave" className="w-1/3 rounded-md top-[4px]" />
                )}
              </Typography>
            </div>
          </div>
          <DividerLine />
          <div className="h-full min-w-[90px]">
            <div>
              <Typography color="#868E95" className="font-aeonik font-[300] text-xs flex gap-1" gutterBottom>
                Global TVL
                <div className="self-center">
                  <MrgnTooltip
                    title={
                      <>
                        <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                          Global TVL
                        </Typography>
                        <div className="flex flex-col gap-2 pb-2">
                          <div>Total value locked in the marginfi protocol, calculated as:</div>
                          <div className="text-xs text-center">{"deposits - borrowed"}</div>
                        </div>
                      </>
                    }
                    placement="top"
                  >
                    <Image src="/info_icon.png" alt="info" height={16} width={16} />
                  </MrgnTooltip>
                </div>
              </Typography>
              <Typography color="#fff" className="font-aeonik font-[500] text-xl" component="div">
                {globalTVL ? (
                  `$${numeralFormatter(globalTVL)}`
                ) : (
                  <Skeleton variant="rectangular" animation="wave" className="w-1/3 rounded-md top-[4px]" />
                )}
              </Typography>
            </div>
          </div>
          <DividerLine />
          <div className="h-full min-w-[90px]">
            <div>
              <Typography color="#868E95" className="font-aeonik font-[300] text-xs flex gap-1" gutterBottom>
                Global Points
                <div className="self-center">
                  <MrgnTooltip
                    title={
                      <>
                        <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                          Points
                        </Typography>
                        <div className="flex flex-col gap-2 pb-2">
                          <div>
                            Learn more about points{" "}
                            <Link href="/points">
                              <u>here</u>
                            </Link>
                            .
                          </div>
                        </div>
                      </>
                    }
                    placement="top"
                  >
                    <Image src="/info_icon.png" alt="info" height={16} width={16} />
                  </MrgnTooltip>
                </div>
              </Typography>
              <Typography color="#fff" className="font-aeonik font-[500] text-xl" component="div">
                {globalPoints ? (
                  numeralFormatter(globalPoints)
                ) : (
                  <Skeleton variant="rectangular" animation="wave" className="w-1/3 rounded-md top-[4px]" />
                )}
              </Typography>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DividerLine = () => <div style={{ width: "1px", borderLeft: "1px solid #555" }} />;

export { GlobalStats };
