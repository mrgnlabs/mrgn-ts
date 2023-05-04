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
    <div className={"h-[112px] w-1/3 flex flex-col justify-evenly items-start px-6 py-3 rounded-xl text-lg"}>
      <div
        className="text-base text-[#868E95]"
        style={{
          fontFamily: "Aeonik Pro",
          fontWeight: valueBold ? 400 : 300,
        }}
      >
        {label}
      </div>
      {preview ? (
        <div
          className="text-sm text-[#868E95]"
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

const RewardMetric: FC<AccountMetricProps> = ({ label, value, valueBold, preview, boldValue }) => {
  return (
    <div
      className={"h-[112px] w-1/3 flex flex-col justify-evenly items-start px-6 py-3 rounded-xl text-lg"}
      style={{
        border: 'solid rgba(250,189,18, 0.5) 1px'
      }}
    >
      <div
        className="text-base text-[#868E95]"
        style={{
          fontFamily: "Aeonik Pro",
          fontWeight: 400,
          
        }}
      >
        {label}
      </div>
      <div
        className="text-xl text-[#fff]"
        style={{
          fontFamily: "Aeonik Pro",
          fontWeight: 500,
        }}
      >
        {value}
      </div>
    </div>
  );
};

export { AccountMetric, RewardMetric };
