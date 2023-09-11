import { FC } from "react";
import { Typography, Skeleton } from "@mui/material";

import { numeralFormatter, percentFormatterDyn } from "@mrgnlabs/mrgn-common";

interface StakingStatsProps {
  tvl: number;
  projectedApy: number;
}

export const StakingStats: FC<StakingStatsProps> = ({ tvl, projectedApy }) => {
  return (
    <div className="h-full rounded-xl font-[500] p-[10px]">
      <div className="flex flex-row justify-center gap-8 w-full min-w-1/2 mt-[20px]">
        <div className="h-full">
          <div>
            <Typography
              color="#868E95"
              className="font-aeonik font-[300] text-xs flex gap-1"
              gutterBottom
              component="div"
            >
              TVL
            </Typography>
            <Typography color="#fff" className="font-aeonik font-[500] text-lg md:text-xl" component="div">
              {tvl ? (
                `$${numeralFormatter(tvl)}`
              ) : (
                <Skeleton variant="rectangular" animation="wave" className="w-1/3 rounded-md top-[4px]" />
              )}
            </Typography>
          </div>
        </div>
        <DividerLine />
        <div className="h-full">
          <div>
            <Typography
              color="#868E95"
              className="font-aeonik font-[300] text-xs flex gap-1"
              gutterBottom
              component="div"
            >
              Projected APY
            </Typography>
            <Typography color="#fff" className="font-aeonik font-[500] text-lg md:text-xl" component="div">
              {projectedApy ? (
                percentFormatterDyn.format(projectedApy)
              ) : (
                <Skeleton variant="rectangular" animation="wave" className="w-1/3 rounded-md top-[4px]" />
              )}
            </Typography>
          </div>
        </div>
      </div>
    </div>
  );
};

const DividerLine = () => <div style={{ width: "1px", borderLeft: "1px solid #555" }} />;
