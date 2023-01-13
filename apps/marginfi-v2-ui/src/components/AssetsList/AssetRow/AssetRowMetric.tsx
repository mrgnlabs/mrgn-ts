import { FC } from "react";

interface AssetRowMetricProps {
  shortLabel: string;
  longLabel: string;
  value: string; // @todo make correct format type
  borderRadius: string;
}

const AssetRowMetric: FC<AssetRowMetricProps> = ({
  shortLabel,
  longLabel,
  value,
  borderRadius,
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
      <div className="text-xs text-white">{value}</div>
    </div>
  );
};

export { AssetRowMetric };
