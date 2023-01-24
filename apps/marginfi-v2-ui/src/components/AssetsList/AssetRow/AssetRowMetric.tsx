import { FC } from "react";

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
      className="bg-[#00000033] border-solid border border-[#171C1F] h-12 w-full min-w-fit max-w-[200px] flex flex-col justify-evenly p-1 px-2"
      style={{
        borderRadius: borderRadius,
        fontFamily: "Aeonik Pro",
        fontWeight: 400,
      }}
    >
      <div className="text-sm text-[#868E95] hidden xl:block">{longLabel}</div>
      <div className="text-sm text-[#868E95] block xl:hidden">{shortLabel}</div>
      <div className={`text-sm text-white ${usdEquivalentValue !== undefined ? "flex flex-row gap-1" : ""}`}>
        {value}
        {usdEquivalentValue !== undefined && (
          <div
            className="text-[#868E95] px-1 hidden lg:flex justify-center items-center text-xs"
            style={{
              // fontSize: 10,
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
