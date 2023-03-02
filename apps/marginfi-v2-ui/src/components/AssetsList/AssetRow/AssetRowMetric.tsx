import { FC } from "react";

interface AssetRowMetricProps {
  shortLabel: string;
  longLabel: string;
  value: string;
  firstMetric?: boolean;
  lastMetric?: boolean;
  usdEquivalentValue?: string;
}

const AssetRowMetric: FC<AssetRowMetricProps> = ({
  shortLabel,
  longLabel,
  value,
  firstMetric,
  lastMetric,
  usdEquivalentValue,
}) => {
  return (
    <div
      // @todo is `items-center` better here on mobile?
      className="bg-[#00000033] h-full w-full min-w-fit max-w-[200px] flex flex-col justify-evenly p-1 px-2 items-start"
      style={{
        borderTop: 'solid 1px #171C1F',
        borderBottom: 'solid 1px #171C1F',
        borderLeft: firstMetric ? 'solid 1px #171C1F' : '',
        borderRight: lastMetric ? 'solid 1px #171C1F' : '',
        borderTopLeftRadius: firstMetric ? '0.375rem' : '',
        borderBottomLeftRadius: firstMetric ? '0.375rem' : '',
        borderTopRightRadius: lastMetric ? '0.375rem' : '',
        borderBottomRightRadius: lastMetric ? '0.375rem' : '',
        fontFamily: "Aeonik Pro",
        fontWeight: 400,
      }}
    >
      <div className="text-xs text-[#868E95] hidden xl:block">{longLabel}</div>
      <div className="text-xs text-[#868E95] block xl:hidden">{shortLabel}</div>
      <div className={`text-base text-white ${usdEquivalentValue !== undefined ? "flex flex-row gap-1" : ""}`}>
        {value}
        {usdEquivalentValue !== undefined && (
          <div
            className="text-[#868E95] px-1 hidden lg:flex justify-center items-center text-xs"
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
