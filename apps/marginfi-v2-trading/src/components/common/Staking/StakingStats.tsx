import { FC } from "react";
import { Typography } from "@mui/material";
import { numeralFormatter, percentFormatterDyn } from "@mrgnlabs/mrgn-common";
import { useLstStore } from "~/store";

export const StakingStats: FC = () => {
  const [lstData, solUsdValue] = useLstStore((state) => [state.lstData, state.solUsdValue]);

  return (
    <div className="h-full rounded-xl font-[500]">
      <div className="flex flex-col sm:flex-row justify-center gap-0 sm:gap-8 w-full min-w-1/2 mt-[20px] bg-[#171C1F] sm:bg-transparent rounded-xl">
        <div className="flex flex-row sm:flex-col justify-between p-3 sm:p-0 gap-1">
          <Typography
            color="#868E95"
            className="font-aeonik font-[400] text-base flex gap-1 my-auto"
            gutterBottom
            component="div"
          >
            TVL
          </Typography>
          <Typography color="#fff" className="font-aeonik font-[500] text-xl" component="div">
            {lstData && solUsdValue ? `$${numeralFormatter(lstData.tvl * solUsdValue)}` : "-"}
          </Typography>
        </div>

        <DividerLine />

        <div className="flex flex-row sm:flex-col justify-between p-3 sm:p-0 gap-1">
          <Typography
            color="#868E95"
            className="font-aeonik font-[400] text-base flex gap-1 my-auto"
            gutterBottom
            component="div"
          >
            Projected APY
          </Typography>
          <Typography color="#fff" className="font-aeonik font-[500] text-xl" component="div">
            {lstData ? percentFormatterDyn.format(lstData.projectedApy) : "-"}
          </Typography>
        </div>
      </div>
    </div>
  );
};

const DividerLine = () => <div className="hidden sm:block" style={{ width: "1px", borderLeft: "1px solid #555" }} />;
