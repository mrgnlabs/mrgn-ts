import React from "react";
import { AnchorProvider, Program } from "@coral-xyz/anchor";

import { cn } from "@mrgnlabs/mrgn-utils";
import { BankConfigOpt, getConfig, MARGINFI_IDL, MarginfiIdlType, MarginfiProgram } from "@mrgnlabs/marginfi-client-v2";
import { dynamicNumeralFormatter, percentFormatter, Wallet } from "@mrgnlabs/mrgn-common";

import { Button } from "~/components/ui/button";
import { useConnection } from "~/hooks/use-connection";

import { CreatePoolState, PoolData, PoolMintData } from "../types";
import wallet from "~/pages/api/user/wallet";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { lamportsToSol } from "@solana/spl-stake-pool/dist/utils";

type CreatePoolReviewProps = {
  poolData: PoolData | null;
  setCreatePoolState: React.Dispatch<React.SetStateAction<CreatePoolState>>;
};

export const CreatePoolReview = ({ poolData, setCreatePoolState }: CreatePoolReviewProps) => {
  const { connection } = useConnection();
  const [bankInitFlatSolFee, setBankInitFlatSolFee] = React.useState<number>(0.15);

  const fetchFeeState = async () => {
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
    console.log("program", programId);
    const [feeStateKey] = PublicKey.findProgramAddressSync([Buffer.from("feestate", "utf-8")], programId);
    const feeState = await program.account.feeState.fetch(feeStateKey);
    setBankInitFlatSolFee((feeState.bankInitFlatSolFee ?? 0) / LAMPORTS_PER_SOL);
  };

  React.useEffect(() => {
    if (poolData) {
      console.log("poolData", poolData);
      fetchFeeState();
    }
  }, [poolData]);

  if (!poolData || !poolData.tokenBankConfig || !poolData.quoteBankConfig || !poolData.quoteToken) return null;

  return (
    <>
      <div className="text-center space-y-2 w-full mx-auto">
        <h2 className="text-3xl font-medium">Pool Summary</h2>
        <p className="text-lg text-muted-foreground">Review the pool configuration</p>
      </div>

      <div className="flex flex-col gap-2">
        <div className={cn("gap-2 w-full flex flex-row flex-wrap items-center")}>
          <div className="flex-1 border rounded-lg p-4">
            <h3 className="text-lg flex flex-row gap-1 items-center font-medium">
              Token: <img src={poolData.token.icon} className="w-4 h-4 rounded-full" /> {poolData.token.name} (
              {poolData.token.symbol})
            </h3>
            <TokenSummary mintData={poolData.token} bankConfig={poolData.tokenBankConfig} />
          </div>
          <div className="flex-1 border rounded-lg p-4">
            <h3 className="text-lg flex flex-row gap-1 items-center font-medium">
              Quote: <img src={poolData.quoteToken.icon} className="w-4 h-4 rounded-full" /> {poolData.quoteToken.name}{" "}
              ({poolData.quoteToken.symbol})
            </h3>
            <TokenSummary mintData={poolData.quoteToken} bankConfig={poolData.quoteBankConfig} />
          </div>
        </div>

        <p className="text-md py-2 text-muted-foreground">
          Flat fee to initialize the pool: {bankInitFlatSolFee * 2} SOL
        </p>

        <div className="w-full flex flex-col items-center">
          <div className="flex flex-col gap-4">
            <Button type="button" onClick={() => setCreatePoolState(CreatePoolState.LOADING)}>
              Create Pool
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

const TokenSummary = ({ mintData, bankConfig }: { mintData: PoolMintData; bankConfig: BankConfigOpt }) => {
  const hasOracleKeys = React.useMemo(() => (bankConfig?.oracle?.keys?.length ?? 0) > 0, [bankConfig]);

  return (
    <div className="flex flex-col">
      <div className="flex flex-row justify-between">
        <p className="text-sm text-muted-foreground">Price</p>
        <p className="text-sm text-muted-foreground">${dynamicNumeralFormatter(mintData.price)}</p>
      </div>
      <div className="flex flex-row justify-between">
        <p className="text-sm text-muted-foreground">Decimals</p>
        <p className="text-sm text-muted-foreground">{mintData.decimals}</p>
      </div>
      <div className="flex flex-row justify-between">
        <p className="text-sm text-muted-foreground">Deposit Limit</p>
        <p className="text-sm text-muted-foreground">
          {bankConfig.depositLimit?.shiftedBy(-mintData.decimals).toFixed(2)} {mintData.symbol}
        </p>
      </div>
      <div className="flex flex-row justify-between">
        <p className="text-sm text-muted-foreground">Borrow Limit</p>
        <p className="text-sm text-muted-foreground">
          {bankConfig.borrowLimit?.shiftedBy(-mintData.decimals).toFixed(2)} {mintData.symbol}
        </p>
      </div>
      <div className="flex flex-row justify-between">
        <p className="text-sm text-muted-foreground">Origination Fee</p>
        <p className="text-sm text-muted-foreground">
          {percentFormatter.format(bankConfig.interestRateConfig?.protocolOriginationFee.toNumber() ?? 0)}
        </p>
      </div>
      <div className="flex flex-row justify-between">
        <p className="text-sm text-muted-foreground">Protocol Fee</p>
        <p className="text-sm text-muted-foreground">
          {percentFormatter.format(bankConfig.interestRateConfig?.protocolFixedFeeApr.toNumber() ?? 0)}
        </p>
      </div>
      <div className="flex flex-row justify-between">
        <p className="text-sm text-muted-foreground">Oracle</p>
        <p className="text-sm text-muted-foreground">
          {hasOracleKeys ? bankConfig?.oracle?.setup : "Oracle created at next step"}
        </p>
      </div>
    </div>
  );
};
