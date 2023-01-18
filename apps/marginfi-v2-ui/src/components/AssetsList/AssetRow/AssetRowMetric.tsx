import { FC } from "react";

interface AssetRowMetricProps {
  shortLabel: string;
  longLabel: string;
  value: string; // @todo make correct format type
  borderRadius: string;
  usdEquivalentValue?: string;
  showUSDEquivalent?: boolean;
}

const AssetRowMetric: FC<AssetRowMetricProps> = ({
  shortLabel,
  longLabel,
  value,
  borderRadius,
  usdEquivalentValue,
  showUSDEquivalent,
}) => {
  return (
    <div
      className="bg-[#00000033] border-solid border border-[#171C1F] h-12 w-full max-w-[200px] flex flex-col justify-evenly p-1 px-3"
      style={{
        borderRadius: borderRadius,
      }}
    >
      <div className="text-xs text-[#868E95] hidden lg:block">{longLabel}</div>
      <div className="text-xs text-[#868E95] block lg:hidden">{shortLabel}</div>
      <div
        className={`text-xs text-white ${showUSDEquivalent ? "flex flex-row gap-1" : ""}`}
      >
        {value}
        {
          showUSDEquivalent &&
          <div
            className="text-[#868E95] px-1"
            style={{
              fontSize: 10,
              backgroundColor: 'rgba(113, 119, 126, 0.3)',
              borderRadius: '4px',
            }}
          >
            {usdEquivalentValue}
          </div>
        }
      </div>
    </div>
  );
};

export { AssetRowMetric };
