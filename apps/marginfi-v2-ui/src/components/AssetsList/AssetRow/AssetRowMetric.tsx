import { FC } from "react";
import { groupedNumberFormatter, usdFormatter } from "~/utils";

interface AssetRowMetricProps {
  shortLabel: string;
  longLabel: string;
  value: string;
  borderRadius: string;
  usdEquivalentValue?: string;
}

const AssetRowMetric: FC<AssetRowMetricProps> = ({
  shortLabel,
  longLabel,
  value,
  borderRadius,
  usdEquivalentValue,
}) => {
  return (
    <div
      className="bg-[#00000033] border-solid border border-[#171C1F] h-16 w-full max-w-[200px] flex flex-col justify-between py-1.5 px-3"
      style={{
        borderRadius: borderRadius,
        fontFamily: 'Aeonik Pro',
        fontWeight: 400,
      }}
    >
      <div className="text-base text-[#868E95] hidden lg:block">{longLabel}</div>
      <div className="text-base text-[#868E95] block lg:hidden">{shortLabel}</div>
      <div
        className={`text-base text-white ${
          usdEquivalentValue !== undefined ? "flex flex-row gap-1" : ""
        }`}
      >
        {value}
        {usdEquivalentValue !== undefined && (
          <div
            className="text-[#868E95] text-xs px-1 hidden lg:flex justify-center items-center"
            style={{
              backgroundColor: "rgba(113, 119, 126, 0.3)",
              borderRadius: "4px",
            }}
          >
            {usdEquivalentValue}
          </div>
        )}
      </div>
    </div>
  );
};

export { AssetRowMetric };
