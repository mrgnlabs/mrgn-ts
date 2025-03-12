import React from "react";
import BigNumber from "bignumber.js";
import { IconCheck, IconChevronLeft } from "@tabler/icons-react";

import { cn } from "@mrgnlabs/mrgn-utils";
import { percentFormatter, Wallet } from "@mrgnlabs/mrgn-common";
import { BankConfigOpt, getConfig, MarginfiClient, OracleConfigOpt } from "@mrgnlabs/marginfi-client-v2";

import { Button } from "~/components/ui/button";
import { Loader } from "~/components/ui/loader";
import { Slider } from "~/components/ui/slider";
import {
  MAX_GROUP_FEE,
  MAX_WARNING_THRESHOLD,
  MIN_GROUP_FEE,
  MIN_ORGINIATION_FEE,
  WARNING_THRESHOLD,
} from "~/consts/bank-config.consts";
import { MAX_ORGINIATION_FEE } from "~/consts/bank-config.consts";
import { getBankConfig } from "~/utils";
import { useConnection } from "~/hooks/use-connection";

import { CreatePoolState, PoolData } from "../types";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import { PublicKey } from "@solana/web3.js";

type CreatePoolConfigureProps = {
  poolData: PoolData | null;
  setPoolData: React.Dispatch<React.SetStateAction<PoolData | null>>;
  setCreatePoolState: React.Dispatch<React.SetStateAction<CreatePoolState>>;
};

export const CreatePoolConfigure = ({ poolData, setPoolData, setCreatePoolState }: CreatePoolConfigureProps) => {
  const [originationFee, setOriginationFee] = React.useState(MIN_ORGINIATION_FEE);
  const [groupFee, setGroupFee] = React.useState(MIN_GROUP_FEE);
  const [useExistingOracle, setUseExistingOracle] = React.useState(true);

  const [isLoading, setIsLoading] = React.useState(true);

  const [marginfiClient, setMarginfiClient] = React.useState<MarginfiClient | null>(null);
  const [tokenConfig, setTokenConfig] = React.useState<{
    bankConfig: BankConfigOpt | null;
    oracleConfig: OracleConfigOpt | null;
  } | null>(null);
  const [quoteTokenConfig, setQuoteTokenConfig] = React.useState<{
    bankConfig: BankConfigOpt | null;
    oracleConfig: OracleConfigOpt | null;
  } | null>(null);
  const { connection } = useConnection();

  const fetchBankConfigs = React.useCallback(
    async (poolData: PoolData, useExistingOracleParam: boolean) => {
      if (!poolData?.token.mint) return;
      if (!poolData?.quoteToken?.mint) return;

      let client = marginfiClient;

      if (!client) {
        const dummyWallet = {
          publicKey: PublicKey.default,
          signMessage: (arg: any) => {},
          signTransaction: (arg: any) => {},
          signAllTransactions: (arg: any) => {},
        } as Wallet;
        const config = getConfig("production");
        client = await MarginfiClient.fetch(config, dummyWallet, connection);
        setMarginfiClient(client);
      }

      const tokenConfig = await getBankConfig(
        client,
        poolData?.token.mint,
        poolData?.token.decimals,
        useExistingOracleParam
      );
      const quoteTokenConfig = await getBankConfig(
        client,
        poolData?.quoteToken.mint,
        poolData?.quoteToken.decimals,
        useExistingOracleParam
      );

      setTokenConfig(tokenConfig);
      setQuoteTokenConfig(quoteTokenConfig);
      setIsLoading(false);
    },
    [connection, marginfiClient]
  );

  React.useEffect(() => {
    if (!poolData) return;
    fetchBankConfigs(poolData, useExistingOracle);
  }, [fetchBankConfigs, poolData, useExistingOracle]);

  const onSubmit = React.useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!tokenConfig || !quoteTokenConfig || !poolData) return;

      const finalTokenBankConfig: BankConfigOpt = {
        ...tokenConfig.bankConfig!,
        interestRateConfig: {
          ...tokenConfig.bankConfig!.interestRateConfig!,
          protocolOriginationFee: new BigNumber(originationFee),
          protocolIrFee: new BigNumber(groupFee),
        },
      };

      const finalQuoteTokenBankConfig: BankConfigOpt = {
        ...quoteTokenConfig.bankConfig!,
        interestRateConfig: {
          ...quoteTokenConfig.bankConfig!.interestRateConfig!,
          protocolOriginationFee: new BigNumber(originationFee),
          protocolIrFee: new BigNumber(groupFee),
        },
      };

      setPoolData({
        ...poolData,
        tokenConfig: {
          ...tokenConfig,
          bankConfig: finalTokenBankConfig,
        },
        quoteTokenConfig: {
          ...quoteTokenConfig,
          bankConfig: finalQuoteTokenBankConfig,
        },
      });
      setCreatePoolState(CreatePoolState.REVIEW);
    },
    [tokenConfig, quoteTokenConfig, poolData, originationFee, groupFee, setPoolData, setCreatePoolState]
  );

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1 absolute top-2 left-1.5 text-muted-foreground"
        onClick={() => {
          setCreatePoolState(CreatePoolState.FORM);
        }}
      >
        <IconChevronLeft size={18} /> Back
      </Button>
      <div className="text-center space-y-2 w-full mx-auto pb-2">
        <h2 className="text-3xl font-medium">Bank Configuration</h2>
        <p className="text-muted-foreground">Review the bank configuration and adjust the fees as necessary.</p>
      </div>

      {isLoading || !tokenConfig || !quoteTokenConfig ? (
        <div className="flex items-center w-full  justify-center">
          <Loader label="Loading the bank configuration..." />
        </div>
      ) : (
        <form className={cn("space-y-8 w-full flex flex-col items-center")} onSubmit={onSubmit}>
          <div className="space-y-4 max-w-lg w-full">
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-md font-medium">Oracle Configuration</h4>
                <p className="text-sm font-normal text-muted-foreground">
                  Use existing marginfi main pool oracle if available, otherwise create a new Switchboard oracle.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="oracle-mode" checked={useExistingOracle} onCheckedChange={setUseExistingOracle} />
                <Label htmlFor="oracle-mode">Use existing marginfi main pool oracle</Label>
              </div>
            </div>
          </div>
          <div className="space-y-4 max-w-lg w-full">
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-md font-medium">Origination Fee</h4>
                <p className="text-sm font-normal text-muted-foreground">
                  The origination fee is the fee charged to the borrower when they create a new position.
                </p>
              </div>
              <Slider
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
                <p className="text-sm font-normal text-muted-foreground">{`${percentFormatter.format(
                  originationFee
                )}`}</p>
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
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-md font-medium">Group Fee</h4>
                <p className="text-sm font-normal text-muted-foreground">
                  The group fee is applied to borrow interest and paid when borrow interest accumulates
                </p>
              </div>
              <Slider
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
              <div className="h-2">
                {MAX_WARNING_THRESHOLD < groupFee ? (
                  <p className="text-sm font-normal text-destructive">
                    Warning: The group fee is very high. Consider reducing it to attract more users.
                  </p>
                ) : WARNING_THRESHOLD < groupFee ? (
                  <p className="text-sm font-normal text-mrgn-warning">
                    The group fee is higher than recommended. A lower fee may increase activity.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <Button type="submit" variant="default">
              <IconCheck size={18} /> Confirm Bank Configuration
            </Button>
          </div>
        </form>
      )}
    </>
  );
};
