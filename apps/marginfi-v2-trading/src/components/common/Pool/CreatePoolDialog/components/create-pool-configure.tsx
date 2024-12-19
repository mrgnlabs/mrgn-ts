import React from "react";
import { CreatePoolState, PoolData } from "../types";
import { getBankConfig } from "~/utils";
import { cn } from "@mrgnlabs/mrgn-utils";
import { Slider } from "~/components/ui/slider";
import { MAX_GROUP_FEE, MIN_GROUP_FEE, MIN_ORGINIATION_FEE } from "~/consts/bank-config.consts";
import { MAX_ORGINIATION_FEE } from "~/consts/bank-config.consts";
import { percentFormatter } from "@mrgnlabs/mrgn-common";
import { Button } from "~/components/ui/button";
import { BankConfigOpt } from "@mrgnlabs/marginfi-client-v2";
import BigNumber from "bignumber.js";

type CreatePoolConfigureProps = {
  poolData: PoolData | null;
  setPoolData: React.Dispatch<React.SetStateAction<PoolData | null>>;
  setCreatePoolState: React.Dispatch<React.SetStateAction<CreatePoolState>>;
};

export const CreatePoolConfigure = ({ poolData, setPoolData, setCreatePoolState }: CreatePoolConfigureProps) => {
  const [originationFee, setOriginationFee] = React.useState(MIN_ORGINIATION_FEE);
  const [groupFee, setGroupFee] = React.useState(MIN_GROUP_FEE);

  const tokenBankConfig = React.useMemo(() => {
    if (!poolData?.token.mint) return null;
    return getBankConfig(poolData?.token.mint, poolData?.token.price, poolData?.token.decimals);
  }, [poolData]);

  const quoteTokenBankConfig = React.useMemo(() => {
    if (!poolData?.quoteToken?.mint) return null;
    return getBankConfig(poolData?.quoteToken.mint, poolData?.quoteToken.price, poolData?.quoteToken.decimals);
  }, [poolData]);

  const onSubmit = React.useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!tokenBankConfig || !quoteTokenBankConfig || !poolData) return;

      const finalTokenBankConfig: BankConfigOpt = {
        ...tokenBankConfig,
        interestRateConfig: {
          ...tokenBankConfig.interestRateConfig!,
          protocolOriginationFee: new BigNumber(originationFee),
          protocolFixedFeeApr: new BigNumber(groupFee),
        },
      };

      const finalQuoteTokenBankConfig: BankConfigOpt = {
        ...quoteTokenBankConfig,
        interestRateConfig: {
          ...quoteTokenBankConfig.interestRateConfig!,
          protocolOriginationFee: new BigNumber(originationFee),
          protocolFixedFeeApr: new BigNumber(groupFee),
        },
      };

      setPoolData({
        ...poolData,
        tokenBankConfig: finalTokenBankConfig,
        quoteBankConfig: finalQuoteTokenBankConfig,
      });
      setCreatePoolState(CreatePoolState.REVIEW);
    },
    [tokenBankConfig, quoteTokenBankConfig, originationFee, groupFee]
  );

  if (!tokenBankConfig || !quoteTokenBankConfig) return null;

  return (
    <>
      <div className="text-center space-y-2 w-full mx-auto">
        <h2 className="text-3xl font-medium">Bank Configuration</h2>
        <p className="text-lg text-muted-foreground">Review the bank configuration and adjust the fees as necessary.</p>
      </div>

      <form className={cn("space-y-8 w-full flex flex-col items-center")} onSubmit={onSubmit}>
        <div className="space-y-2 max-w-lg w-full">
          <h4 className="text-md font-medium">Origination Fee</h4>
          <p className="text-sm pb-2 font-normal text-muted-foreground">
            The origination fee is the fee charged to the borrower when they create a new position.
          </p>
          <Slider
            defaultValue={[1]}
            max={MAX_ORGINIATION_FEE}
            min={MIN_ORGINIATION_FEE}
            step={0.0001}
            value={[originationFee]}
            onValueChange={(value) => {
              if (value[0] > MAX_ORGINIATION_FEE) return;
              setOriginationFee(value[0]);
            }}
          />
          <div className="flex items-center justify-between">
            <p className="text-sm font-normal text-muted-foreground">{`${percentFormatter.format(originationFee)}`}</p>
            <span className="flex items-center gap-1">
              <span className="text-muted-foreground text-sm">
                {percentFormatter.format(MAX_ORGINIATION_FEE)}
                <button
                  type="button"
                  disabled={!!!MAX_ORGINIATION_FEE}
                  className="ml-1 text-xs cursor-pointer text-primary border-b border-transparent hover:border-primary"
                  onClick={() => setOriginationFee(Number(MAX_ORGINIATION_FEE))}
                >
                  MAX
                </button>
              </span>
            </span>
          </div>
          <h4 className="text-md font-medium">Group Fee</h4>
          <p className="text-sm pb-2 font-normal text-muted-foreground">
            The group fee is the fee charged to the group. (TODO: add description)
          </p>
          <Slider
            defaultValue={[1]}
            max={MAX_GROUP_FEE}
            min={MIN_GROUP_FEE}
            step={0.0001}
            value={[groupFee]}
            onValueChange={(value) => {
              if (value[0] > MAX_GROUP_FEE) return;
              setGroupFee(value[0]);
            }}
          />
          <div className="flex items-center justify-between">
            <p className="text-sm font-normal text-muted-foreground">{`${percentFormatter.format(groupFee)}`}</p>
            <span className="flex items-center gap-1">
              <span className="text-muted-foreground text-sm">
                {percentFormatter.format(MAX_GROUP_FEE)}
                <button
                  type="button"
                  disabled={!!!MAX_GROUP_FEE}
                  className="ml-1 text-xs cursor-pointer text-primary border-b border-transparent hover:border-primary"
                  onClick={() => setGroupFee(Number(MAX_GROUP_FEE))}
                >
                  MAX
                </button>
              </span>
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <Button type="submit" variant="default">
            Confirm Bank Configuration
          </Button>
        </div>
      </form>
    </>
  );
};
