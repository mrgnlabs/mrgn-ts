import React, { FC } from "react";

interface AccountMetricProps {
  label: string;
  value: string;
  valueBold?: boolean;
  extraBorder?: boolean;
  boldValue?: string;
}

const AccountMetric: FC<AccountMetricProps> = ({
  label,
  value,
  valueBold,
  boldValue = "#75ba80",
}) => {
  return (
    <div
      className={
        "h-[112px] w-1/3 flex flex-col justify-evenly items-start px-6 py-3 rounded-xl"
      }
    >
      <div
        className="text-base text-[#868E95]"
        style={{
          fontFamily: "Aeonik Pro",
          fontWeight: valueBold ? 400 : 300,
        }}
      >
        {label}
      </div>
      <div
        className="text-lg"
        style={{
          fontFamily: "Aeonik Pro",
          fontWeight: valueBold ? 500 : 300,
          color: valueBold ? boldValue : "#fff",
        }}
      >
        {value}
      </div>
    </div>
  );
};

export { AccountMetric };
