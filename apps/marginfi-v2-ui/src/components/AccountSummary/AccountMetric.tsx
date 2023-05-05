import Image from "next/image";
import React, { FC } from "react";
import { Button, ButtonProps } from "@mui/material";
import { MarginfiAccount } from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo } from "~/types";

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


interface RewardMetricProps {
  value?: string;
  marginfiAccount: MarginfiAccount | null;
  extendedBankInfos: ExtendedBankInfo[];
}

const RewardMetric: FC<RewardMetricProps> = ({ value, marginfiAccount, extendedBankInfos }) => {
  return (
    <div
      className={"h-[112px] w-1/3 flex flex-col justify-evenly items-start pl-3 py-3 rounded-xl text-lg"}
    >
      <div
        className="text-base text-[#868E95]"
        style={{
          fontFamily: "Aeonik Pro",
          fontWeight: 400,
          
        }}
      >
        <Button
          className="normal-case text-xs h-6 rounded-xs flex gap-1"
          style={{
            backgroundColor: "rgb(227, 227, 227)",
            border: "solid 1px rgb(227, 227, 227)",
            color: "black",
            fontWeight: 400,
            fontFamily: "Aeonik Pro",
            zIndex: 10,
          }}
          onClick={
            () => {
              if (marginfiAccount && (extendedBankInfos?.find(b => b.tokenName === 'UXD')?.bank)) {
                marginfiAccount!.withdrawEmissions(
                  extendedBankInfos.find(b => b.tokenName === 'UXD')!.bank
                );
              }
            }
          }
        >
          <span>Claim</span>
          <span className="hidden lg:block">Rewards</span>
        </Button>
      </div>
      <div
        className="text-lg text-[#6FCF97] flex items-center gap-2"
        style={{
          fontFamily: "Aeonik Pro",
          fontWeight: 500,
        }}
      >
        <div>
          <Image src="/uxp-icon-white.png" alt="info" height={16} width={16} className="pulse"/>
        </div>
        {value}
      </div>
    </div>
  );
};

export { AccountMetric, RewardMetric };
