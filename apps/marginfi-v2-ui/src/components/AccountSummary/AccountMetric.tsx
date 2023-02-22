import React, { FC } from "react";

interface AccountMetricProps {
  label: string;
  value?: string;
  valueBold?: boolean;
  preview?: boolean;
  extraBorder?: boolean;
  boldValue?: string;
}

const AccountMetric: FC<AccountMetricProps> = ({ label, value, valueBold, preview, boldValue }) => {
  return (
    <div className={"h-[112px] w-1/2 flex flex-col justify-evenly items-start px-6 py-3 rounded-xl text-lg"}>
      <div
        className="text-lg sm:text-base text-[#868E95]"
        style={{
          fontFamily: "Aeonik Pro",
          fontWeight: valueBold ? 400 : 300,
        }}
      >
        {label}
      </div>
      {preview ? (
        <div
          className="text-lg sm:text-sm text-[#868E95]"
          style={{
            fontFamily: "Aeonik Pro",
            fontWeight: 500,
          }}
        >
          Coming soon™️
        </div>
      ) : (
        <div
          className="text-xl"
          style={{
            fontFamily: "Aeonik Pro",
            fontWeight: valueBold ? 500 : 300,
            color: valueBold ? boldValue : "#fff",
          }}
        >
          {value}
        </div>
      )}
    </div>
  );
};

export { AccountMetric };
