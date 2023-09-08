import { FC } from "react";
import { Typography, Skeleton } from "@mui/material";
import Image from "next/image";
import Link from "next/link";

import { numeralFormatter } from "@mrgnlabs/mrgn-common";

import { MrgnTooltip } from "~/components/common/MrgnTooltip";

import styles from "./style.module.css";

interface GlobalStatsProps {
  deposits: number;
  borrows: number;
  tvl: number;
  pointsTotal: number | null;
}

const GlobalStats: FC<GlobalStatsProps> = ({ borrows, deposits, pointsTotal, tvl }) => {
  return (
    <div className={styles["hide-scrollbar"]}>
      <div className="flex flex-wrap overflow-hidden gap-4 w-full min-w-1/2 mt-[20px] max-h-[50px]">
        <div className="h-full flex-1">
          <Typography
            color="#868E95"
            className="font-aeonik font-[300] text-xs flex gap-1"
            gutterBottom
            component="div"
          >
            Supplied
            <div className="self-center">
              <MrgnTooltip
                title={
                  <>
                    <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                      Supplied
                    </Typography>
                    Total value supplied across all assets in the marginfi protocol.
                  </>
                }
                placement="top"
              >
                <div className="w-[12px] h-[12px]">
                  <Image src="/info_icon.png" alt="info" height={12} width={12} />
                </div>
              </MrgnTooltip>
            </div>
          </Typography>
          <Typography color="#fff" className="font-aeonik font-[500] text-lg md:text-xl" component="div">
            {deposits ? (
              `$${numeralFormatter(deposits)}`
            ) : (
              <Skeleton variant="rectangular" animation="wave" className="w-1/3 rounded-md top-[4px]" />
            )}
          </Typography>
        </div>
        <DividerLine />
        <div className="h-full flex-1">
          <Typography
            color="#868E95"
            className="font-aeonik font-[300] text-xs flex gap-1"
            gutterBottom
            component="div"
          >
            Borrowed
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
                <div className="w-[12px] h-[12px]">
                  <Image src="/info_icon.png" alt="info" height={12} width={12} />
                </div>
              </MrgnTooltip>
            </div>
          </Typography>
          <Typography color="#fff" className="font-aeonik font-[500] text-lg md:text-xl" component="div">
            {borrows ? (
              `$${numeralFormatter(borrows)}`
            ) : (
              <Skeleton variant="rectangular" animation="wave" className="w-1/3 rounded-md top-[4px]" />
            )}
          </Typography>
        </div>
        <DividerLine />
        <div className="h-full flex-1">
          <Typography
            color="#868E95"
            className="font-aeonik font-[300] text-xs flex gap-1"
            gutterBottom
            component="div"
          >
            TVL
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
                <div className="w-[12px] h-[12px]">
                  <Image src="/info_icon.png" alt="info" height={12} width={12} />
                </div>
              </MrgnTooltip>
            </div>
          </Typography>
          <Typography color="#fff" className="font-aeonik font-[500] text-lg md:text-xl" component="div">
            {tvl ? (
              `$${numeralFormatter(tvl)}`
            ) : (
              <Skeleton variant="rectangular" animation="wave" className="w-1/3 rounded-md top-[4px]" />
            )}
          </Typography>
        </div>
        <DividerLine />
        <div className="h-full flex-1">
          <Typography
            color="#868E95"
            className="font-aeonik font-[300] text-xs flex gap-1"
            gutterBottom
            component="div"
          >
            Points
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
                <div className="w-[12px] h-[12px]">
                  <Image src="/info_icon.png" alt="info" height={12} width={12} />
                </div>
              </MrgnTooltip>
            </div>
          </Typography>
          <Typography color="#fff" className="font-aeonik font-[500] text-lg md:text-xl" component="div">
            {pointsTotal ? (
              numeralFormatter(pointsTotal)
            ) : (
              <Skeleton variant="rectangular" animation="wave" className="w-1/3 rounded-md top-[4px]" />
            )}
          </Typography>
        </div>
      </div>
    </div>
  );
};

const DividerLine = () => <div style={{ width: "1px", borderLeft: "1px solid #555" }} />;

export { GlobalStats };
