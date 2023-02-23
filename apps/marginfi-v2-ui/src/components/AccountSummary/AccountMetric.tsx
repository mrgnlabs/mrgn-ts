import React, { FC } from "react";

interface AccountMetricProps {
  label: string;
  value?: string;
  preview?: boolean;
  extraBorder?: boolean;
  boldValue?: string;
}

// @todo Improve number formatter to contract values on mobile
const AccountMetric: FC<AccountMetricProps> = ({ label, value, preview, boldValue }) => {
  return (
    <div className="h-[112px] w-1/3 flex flex-col justify-evenly items-start py-3 rounded-xl text-lg px-[5%]">
      <div
        className="text-base text-[#868E95]"
        style={{
          fontWeight: 300,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
      <div
        className={`text-xl text-[${ preview ? '#868E95' : '#fff'}]`}
        style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
      >
        {
          preview ? <><span></span><span className="text-sm">Soon™️</span></> : value
        }
      </div>
    </div>
  );
};

export { AccountMetric };
