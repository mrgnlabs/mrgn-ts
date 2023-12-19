import React, { FC } from "react";
import Image from "next/image";

import { Typography } from "@mui/material";

import { percentFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { MrgnTooltip } from "~/components/common/MrgnTooltip";

import { IconPyth, IconSwitchboard } from "~/components/ui/icons";

export const AssetCardHeader: FC<{
  bank: ExtendedBankInfo;
  isInLendingMode: boolean;
  rateAP: string;
}> = ({ bank, isInLendingMode, rateAP }) => {
  const oracle = React.useMemo(
    () => (bank.info.rawBank.config.oracleSetup === 1 ? "Pyth" : "Switchboard"),
    [bank.info.rawBank.config.oracleSetup]
  );

  return (
    <div className="flex flex-row justify-between items-center">
      <div className="flex flex-row gap-3 items-center">
        <div>
          {bank.meta.tokenLogoUri && (
            <Image
              src={bank.meta.tokenLogoUri}
              className="rounded-full"
              alt={bank.meta.tokenSymbol}
              height={40}
              width={40}
            />
          )}
        </div>
        <div className="flex flex-col">
          <div className="text-base">{bank.meta.tokenSymbol}</div>
          <div className="text-[#A1A1A1] flex items-center gap-1.5">
            {usdFormatter.format(bank.info.state.price)}
            <MrgnTooltip title={`Powered by ${oracle}`} placement="right">
              <div>{oracle === "Pyth" ? <IconPyth size={14} /> : <IconSwitchboard size={14} />}</div>
            </MrgnTooltip>
          </div>
        </div>
      </div>
      <div className={`${isInLendingMode ? "text-[#75ba80]" : "text-[#e07d6f]"} text-base flex items-center gap-2`}>
        {bank.meta.tokenSymbol === "UXD" && isInLendingMode && (
          <MrgnTooltip
            title={
              <>
                <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                  Liquidity rewards
                </Typography>
                {`${percentFormatter.format(bank.info.state.lendingRate)} Supply APY + ${percentFormatter.format(
                  bank.info.state.emissionsRate
                )} UXP rewards.`}
                <br />
                <a href="https://docs.marginfi.com">
                  <u>Learn more.</u>
                </a>
              </>
            }
            placement="left"
          >
            <Image src="/uxp-icon-white.png" alt="info" height={16} width={16} className="pulse" />
          </MrgnTooltip>
        )}
        <div className="font-[500]">{rateAP.concat(...[" ", isInLendingMode ? "APY" : "APR"])}</div>
      </div>
    </div>
  );
};
