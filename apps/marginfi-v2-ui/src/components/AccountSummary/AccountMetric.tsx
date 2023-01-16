import React, { FC } from "react";

interface AccountMetricProps {
  label: string;
  value: string;
  valueBold?: boolean;
  extraBorder?: boolean;
}

const AccountMetric: FC<AccountMetricProps> = ({
  label,
  value,
  valueBold,
  extraBorder,
}) => {
  return (
    <div
      className={`h-[112px] w-1/3 flex flex-col justify-evenly items-start px-6 py-3 rounded-xl ${
        extraBorder ? "border-4 border-[#181818]" : ""
      }`}
    >
      <div className="text-base text-[#868E95]">{label}</div>
      <div
        className="text-lg"
        style={{
          fontFamily: 'Aeonik Pro',
          fontWeight: valueBold ? 400 : 300,
        }}
      >
        {value}
      </div>
    </div>
  );
};

export { AccountMetric };
