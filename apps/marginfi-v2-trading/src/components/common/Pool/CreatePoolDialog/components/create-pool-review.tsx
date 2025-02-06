import React from "react";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

import {
  BankConfigOpt,
  getConfig,
  MARGINFI_IDL,
  MarginfiIdlType,
  MarginfiProgram,
  OracleConfigOpt,
} from "@mrgnlabs/marginfi-client-v2";
import { dynamicNumeralFormatter, percentFormatter, shortenAddress, Wallet } from "@mrgnlabs/mrgn-common";
import { IconChevronLeft, IconSparkles } from "@tabler/icons-react";
import { Button } from "~/components/ui/button";
import { useConnection } from "~/hooks/use-connection";

import { CreatePoolState, PoolData, PoolMintData } from "../types";
import { MAX_WARNING_THRESHOLD } from "~/consts/bank-config.consts";
import { WARNING_THRESHOLD } from "~/consts/bank-config.consts";
import { cn } from "@mrgnlabs/mrgn-utils";

type CreatePoolReviewProps = {
  poolData: PoolData | null;
  setCreatePoolState: React.Dispatch<React.SetStateAction<CreatePoolState>>;
};

export const CreatePoolReview = ({ poolData, setCreatePoolState }: CreatePoolReviewProps) => {
  const { connection } = useConnection();
  const [bankInitFlatSolFee, setBankInitFlatSolFee] = React.useState<number>(0.15);

  const fetchFeeState = React.useCallback(async () => {
    if (!connection?.rpcEndpoint) return;
    const { programId } = getConfig();
    const provider = new AnchorProvider(
      connection,
      {
        publicKey: PublicKey.default,
        signMessage: (arg: any) => {},
        signTransaction: (arg: any) => {},
        signAllTransactions: (arg: any) => {},
      } as Wallet,
      {
        ...AnchorProvider.defaultOptions(),
        commitment: "confirmed",
      }
    );
    const idl = { ...(MARGINFI_IDL as unknown as MarginfiIdlType), address: programId.toBase58() };
    const program = new Program(idl, provider) as any as MarginfiProgram;
    const [feeStateKey] = PublicKey.findProgramAddressSync([Buffer.from("feestate", "utf-8")], programId);
    const feeState = await program.account.feeState.fetch(feeStateKey);
    setBankInitFlatSolFee((feeState.bankInitFlatSolFee ?? 0) / LAMPORTS_PER_SOL);
  }, [connection]);

  React.useEffect(() => {
    if (poolData) {
      fetchFeeState();
    }
  }, [fetchFeeState, poolData]);

  if (!poolData || !poolData.tokenConfig || !poolData.quoteTokenConfig || !poolData.quoteToken) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1 absolute top-2 left-1.5 text-muted-foreground"
        onClick={() => {
          setCreatePoolState(CreatePoolState.CONFIGURE);
        }}
      >
        <IconChevronLeft size={18} /> Back
      </Button>
      <div className="text-center space-y-2 w-full mx-auto">
        <h2 className="text-3xl font-medium">Pool Summary</h2>
        <p className="text-muted-foreground">Review the pool configuration</p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="gap-4 w-full flex flex-col md:flex-row">
          <div className="border rounded-lg p-4 w-full">
            <h3 className="font-medium space-y-1">
              <span className="text-muted-foreground">Base Token</span>
              <div className="flex items-center gap-2 text-lg">
                {/* using remote birdeye images for tokens */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={poolData.token.icon} className="w-8 h-8 rounded-full" alt={poolData.token.symbol} />{" "}
                {poolData.token.name} ({poolData.token.symbol})
              </div>
            </h3>
            <TokenSummary
              mintData={poolData.token}
              bankConfig={poolData.tokenConfig.bankConfig}
              oracleConfig={poolData.tokenConfig.oracleConfig}
            />
          </div>
          <div className="border rounded-lg p-4 w-full">
            <h3 className="font-medium space-y-1">
              <span className="text-muted-foreground">Quote Token</span>
              <div className="flex items-center gap-2 text-lg">
                {/* using remote birdeye images for tokens */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={poolData.quoteToken.icon} className="w-4 h-4 rounded-full" alt={poolData.quoteToken.symbol} />
                {poolData.quoteToken.name} ({poolData.quoteToken.symbol})
              </div>
            </h3>
            <TokenSummary
              mintData={poolData.quoteToken}
              bankConfig={poolData.quoteTokenConfig.bankConfig}
              oracleConfig={poolData.quoteTokenConfig.oracleConfig}
            />
          </div>
        </div>

        <p className="text-sm py-2 text-muted-foreground text-center">
          Flat fee to initialize the pool: {bankInitFlatSolFee * 2} SOL
        </p>

        <div className="w-full flex flex-col items-center pt-4">
          <Button type="button" onClick={() => setCreatePoolState(CreatePoolState.LOADING)}>
            <IconSparkles size={18} />
            Create Pool
          </Button>
        </div>
      </div>
    </>
  );
};

const TokenSummary = ({
  mintData,
  bankConfig,
  oracleConfig,
}: {
  mintData: PoolMintData;
  bankConfig: BankConfigOpt;
  oracleConfig: OracleConfigOpt | null;
}) => {
  const hasOracleKeys = React.useMemo(() => (oracleConfig?.keys?.length ?? 0) > 0, [oracleConfig]);
  const protocolIrFee = React.useMemo(() => bankConfig.interestRateConfig?.protocolIrFee.toNumber() ?? 0, [bankConfig]);

  const protocolFeeStatus = React.useMemo(() => {
    if (protocolIrFee > MAX_WARNING_THRESHOLD) return "ALERT";
    if (protocolIrFee > WARNING_THRESHOLD) return "WARNING";
    return "SAFE";
  }, [protocolIrFee]);

  return (
    <div className="flex flex-col mt-4 gap-1 text-sm">
      <div className="flex flex-row justify-between">
        <p className="text-sm text-muted-foreground">Price</p>
        <p className="text-sm">
          $
          {dynamicNumeralFormatter(mintData.price, {
            ignoreMinDisplay: true,
          })}
        </p>
      </div>
      <div className="flex flex-row justify-between">
        <p className="text-sm text-muted-foreground">Decimals</p>
        <p className="text-sm">{mintData.decimals}</p>
      </div>
      <div className="flex flex-row justify-between">
        <p className="text-sm text-muted-foreground">Deposit Limit</p>
        <p className="text-sm">
          {bankConfig.depositLimit?.shiftedBy(-mintData.decimals).toFixed(2)} {mintData.symbol}
        </p>
      </div>
      <div className="flex flex-row justify-between">
        <p className="text-sm text-muted-foreground">Borrow Limit</p>
        <p className="text-sm">
          {bankConfig.borrowLimit?.shiftedBy(-mintData.decimals).toFixed(2)} {mintData.symbol}
        </p>
      </div>
      <div className="flex flex-row justify-between">
        <p className="text-sm text-muted-foreground">Origination Fee</p>
        <p className="text-sm">
          {percentFormatter.format(bankConfig.interestRateConfig?.protocolOriginationFee.toNumber() ?? 0)}
        </p>
      </div>
      <div className="flex flex-row justify-between">
        <p className="text-sm text-muted-foreground">Protocol Fee</p>
        <p
          className={cn(
            "text-sm",
            protocolFeeStatus === "ALERT" ? "text-destructive" : protocolFeeStatus === "WARNING" ? "text-warning" : ""
          )}
        >
          {percentFormatter.format(bankConfig.interestRateConfig?.protocolIrFee.toNumber() ?? 0)}
        </p>
      </div>
      <div className="flex flex-row justify-between">
        <p className="text-sm text-muted-foreground">Oracle</p>
        <p className="text-sm">{hasOracleKeys ? oracleConfig?.setup : "Oracle created at next step"}</p>
      </div>
      {oracleConfig?.keys?.length ? (
        <div className="flex flex-row justify-between">
          <p className="text-sm text-muted-foreground">Oracle Keys</p>
          <p className="text-sm flex flex-col ">
            {oracleConfig.keys
              ?.filter((key) => !key.equals(PublicKey.default))
              .map((key) => (
                <a
                  key={key.toBase58()}
                  href={`https://solscan.io/address/${key.toBase58()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {shortenAddress(key.toBase58())}
                </a>
              ))}
          </p>
        </div>
      ) : null}
    </div>
  );
};
