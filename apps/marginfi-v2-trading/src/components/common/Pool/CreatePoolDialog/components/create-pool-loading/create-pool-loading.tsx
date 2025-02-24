import React from "react";
import { IconLoader2, IconCheck, IconX } from "@tabler/icons-react";
import {
  Keypair,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  Signer,
} from "@solana/web3.js";

import {
  BankConfigOpt,
  MarginfiClient,
  OracleConfigOpt,
  OracleSetup,
  addOracleToBanksIx,
  getConfig,
  instructions,
} from "@mrgnlabs/marginfi-client-v2";
import { cn, getBearerToken, getFeeAccount, createReferalTokenAccount } from "@mrgnlabs/mrgn-utils";
import { addTransactionMetadata, SolanaTransaction, TransactionType } from "@mrgnlabs/mrgn-common";

import { Button } from "~/components/ui/button";
import { useConnection } from "~/hooks/use-connection";
import { useWallet } from "~/components/wallet-v2";
import { createPoolLookupTable, createOracleIx } from "~/utils";

import { PoolData, CreatePoolState } from "../../types";

type StepperStatus = "default" | "success" | "error" | "loading";

type IconMap = { [key in StepperStatus]: React.JSX.Element };

const iconMap: IconMap = {
  success: <IconCheck className="h-6 w-6 text-white bg-success p-1 rounded-full" />,
  error: <IconX className="h-6 w-6 text-white bg-destructive p-1 rounded-full" />,
  loading: <IconLoader2 className="h-6 w-6 rounded-full animate-spin" />,
  default: <IconCheck className="h-6 w-6 border border-muted-foreground p-1 rounded-full" />,
};

interface CreatePoolLoadingProps {
  poolData: PoolData | null;
  setPoolData: React.Dispatch<React.SetStateAction<PoolData | null>>;
  setCreatePoolState: React.Dispatch<React.SetStateAction<CreatePoolState>>;
}

export const CreatePoolLoading = ({ poolData, setPoolData, setCreatePoolState }: CreatePoolLoadingProps) => {
  const { wallet } = useWallet();
  const { connection } = useConnection();
  // const [fetchTradeState] = useTradeStore((state) => [state.fetchTradeState]);
  const [activeStep, setActiveStep] = React.useState<number>(0);
  const [status, setStatus] = React.useState<StepperStatus>("default");

  const steps = React.useMemo(
    () => [
      { label: "Step 1", description: "Setting up a switchboard oracle" },
      { label: "Step 2", description: "Generating transactions" },
      { label: "Step 3", description: "Indexing pool" },
      { label: "Step 4", description: "Executing transactions" },
      { label: "Step 5", description: "Finalizing pool" },
    ],
    []
  );
  const initialized = React.useRef(false);

  const initializeClient = React.useCallback(async () => {
    const config = getConfig();

    const client = await MarginfiClient.fetch(config, wallet, connection);

    return client;
  }, [connection, wallet]);

  const initializeOracle = React.useCallback(
    async (tokenMint: PublicKey, symbol: string) => {
      try {
        const oracleCreation = await createOracleIx(tokenMint, symbol, connection, wallet);

        return oracleCreation;
      } catch (error) {
        setStatus("error");
        console.log("error creating oracle", error);
      }
    },
    [connection, wallet]
  );

  const savePermissionlessPool = async (poolObject: { group: string; asset: string; quote: string; lut: string }) => {
    try {
      const formattedPoolObject = {
        base_bank: poolObject.asset,
        created_by: "mfi1dtjy2mJ9J21UoaQ5dsRnbcg4MBU1CTacVyBp1HF", // TODO: update this
        featured: true,
        group: poolObject.group,
        lookup_tables: [poolObject.lut],
        quote_banks: [poolObject.quote],
      };

      const response = await fetch("/api/pool/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formattedPoolObject),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Pool added:", data);
        return data;
      } else {
        console.error("Failed to add pool");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const createPermissionlessBankBundle = React.useCallback(async () => {
    try {
      setActiveStep(0);

      const verifiedPoolData = verifyPoolData(poolData);
      if (!verifiedPoolData) return;
      const { tokenMint, quoteMint, tokenSymbol, quoteSymbol, tokenConfig, quoteConfig } = verifiedPoolData;

      setStatus("loading");

      // create client
      const client = await initializeClient();
      // create seeds
      const seeds = createSeeds();
      // create oracle ix
      const pullFeedIx: {
        pullFeedIx: TransactionInstruction;
        feedSeed: Keypair;
      }[] = [];
      const updatedTokenBankConfig = { ...tokenConfig.bankConfig };
      const updatedQuoteBankConfig = { ...quoteConfig.bankConfig };

      let updatedTokenOracleConfig = { ...tokenConfig.oracleConfig };
      let updatedQuoteOracleConfig = { ...quoteConfig.oracleConfig };

      if (updatedTokenOracleConfig?.keys?.length === 0) {
        const oracleCreationToken = await initializeOracle(tokenMint, tokenSymbol);
        if (!oracleCreationToken) throw new Error("Oracle creation failed");

        updatedTokenOracleConfig = {
          setup: OracleSetup.SwitchboardPull,
          keys: [oracleCreationToken.feedPubkey],
        };
        pullFeedIx.push(oracleCreationToken);
      }

      if (updatedQuoteOracleConfig?.keys?.length === 0) {
        const oracleCreationQuote = await initializeOracle(quoteMint, quoteSymbol);
        if (!oracleCreationQuote) throw new Error("Oracle creation failed");

        updatedQuoteOracleConfig = {
          setup: OracleSetup.SwitchboardPull,
          keys: [oracleCreationQuote.feedPubkey],
        };
        pullFeedIx.push(oracleCreationQuote);
      }

      setActiveStep(1);

      // create group ix
      const groupIxWrapped = await client.makeCreateMarginfiGroupIx(seeds.marginfiGroupSeed.publicKey);
      // create bank ix wrapper (quote)

      const quoteBankIxWrapper = await client.group.makePoolAddBankIx(
        client.program,
        seeds.stableBankSeed.publicKey,
        quoteMint,
        updatedQuoteBankConfig,
        {
          admin: wallet.publicKey,
          groupAddress: seeds.marginfiGroupSeed.publicKey,
        }
      );

      // create bank ix wrapper (token)
      const tokenBankIxWrapper = await client.group.makePoolAddBankIx(
        client.program,
        seeds.tokenBankSeed.publicKey,
        tokenMint,
        updatedTokenBankConfig,
        {
          admin: wallet.publicKey,
          groupAddress: seeds.marginfiGroupSeed.publicKey,
        }
      );

      // add oracle to banks

      if (
        !updatedTokenOracleConfig.setup ||
        !updatedTokenOracleConfig.keys ||
        !updatedQuoteOracleConfig.setup ||
        !updatedQuoteOracleConfig.keys
      ) {
        throw new Error("Oracle setup or keys not found");
      }

      const addOracleToBanksIxs = [];
      addOracleToBanksIxs.push(
        await addOracleToBanksIx(
          client.program,
          seeds.stableBankSeed.publicKey,
          updatedQuoteOracleConfig.keys[0],
          updatedQuoteOracleConfig.setup
        )
      );
      addOracleToBanksIxs.push(
        await addOracleToBanksIx(
          client.program,
          seeds.tokenBankSeed.publicKey,
          updatedTokenOracleConfig.keys[0],
          updatedTokenOracleConfig.setup
        )
      );

      // create lut ix
      const oracleKeys = [...(updatedTokenOracleConfig?.keys ?? []), ...(updatedQuoteOracleConfig?.keys ?? [])];
      const bankKeys = [seeds.stableBankSeed.publicKey, seeds.tokenBankSeed.publicKey];
      const { lutAddress, createLutIx, extendLutIx } = await createPoolLookupTable({
        client,
        oracleKeys,
        bankKeys,
        groupKey: seeds.marginfiGroupSeed.publicKey,
        walletKey: wallet.publicKey,
      });

      // create referral token account ix
      const feeAccount = getFeeAccount(tokenMint);
      let referralTokenAccountIxs: TransactionInstruction[] = [];
      if (feeAccount) {
        referralTokenAccountIxs = (await createReferalTokenAccount(connection, wallet.publicKey, tokenMint))
          .instructions;
      }

      // transactions
      const transactions: SolanaTransaction[] = [];
      const {
        value: { blockhash },
      } = await connection.getLatestBlockhashAndContext();

      // bundle tip & create oracle transaction
      pullFeedIx.forEach((ix) => {
        transactions.push(createTransaction([ix.pullFeedIx], wallet.publicKey, [ix.feedSeed], blockhash));
      });

      // create lut & create group transaction
      transactions.push(
        createTransaction(
          [createLutIx, extendLutIx, ...groupIxWrapped.instructions],
          wallet.publicKey,
          [seeds.marginfiGroupSeed],
          blockhash
        )
      );

      // create quote bank & referal token account transaction
      transactions.push(
        createTransaction(
          [...quoteBankIxWrapper.instructions, ...referralTokenAccountIxs],
          wallet.publicKey,
          [seeds.stableBankSeed, ...quoteBankIxWrapper.keys],
          blockhash
        )
      );

      // create token bank transaction
      transactions.push(
        createTransaction(
          [...tokenBankIxWrapper.instructions],
          wallet.publicKey,
          [seeds.tokenBankSeed, ...tokenBankIxWrapper.keys],
          blockhash
        )
      );

      setActiveStep(2);

      try {
        const response = await savePermissionlessPool({
          group: seeds.marginfiGroupSeed.publicKey.toBase58(),
          asset: seeds.tokenBankSeed.publicKey.toBase58(),
          quote: seeds.stableBankSeed.publicKey.toBase58(),
          lut: lutAddress.toBase58(),
        });
        console.log("Pool saved:", response);
      } catch (error) {
        console.error("Failed to save pool");
        console.error(error);
        throw error;
      }

      setActiveStep(3);

      // transaction execution
      const sigs = await client.processTransactions(transactions, {
        broadcastType: "BUNDLE",
        bundleTipUi: 0.005, // 0.005 SOL fixed bundle tip
      });

      if (!sigs) throw new Error("Transaction execution failed");

      setPoolData((state) => {
        if (!state) return null;
        return { ...state, group: seeds.marginfiGroupSeed.publicKey };
      });
      setCreatePoolState(CreatePoolState.SUCCESS);
    } catch (error) {
      setStatus("error");
      console.error("Failed to create permissionless pool");
      console.error(error);
    }
  }, [connection, createOracleIx, initializeClient, poolData, setCreatePoolState, setPoolData, wallet]);

  React.useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      createPermissionlessBankBundle();
    }
  }, []);

  return (
    <>
      <div className="text-center space-y-2 max-w-lg mx-auto">
        <h2 className="text-3xl font-medium">Creating new pool</h2>
        <p className="text-lg text-muted-foreground">Executing transactions to configure new group and banks.</p>
      </div>
      <div className="flex flex-col gap-2 relative w-full max-w-fit mx-auto bg-accent pl-4 pr-3 py-2 rounded-lg text-muted-foreground">
        {steps.map((step, idx) => {
          let stepState: StepperStatus = "default";
          let showRetry = false;

          if (activeStep === idx) {
            stepState = status;
            if (status === "error") showRetry = true;
          } else if (activeStep > idx) {
            stepState = "success";
          }

          const icon = iconMap[stepState];
          return (
            <div key={idx} className={cn("flex gap-3 items-center h-10 w-full", activeStep === idx && "text-primary")}>
              <div>{icon}</div>
              <div>{step.description}</div>
              <div className={cn("ml-auto", !showRetry && "px-4")}>
                {showRetry && (
                  <Button variant="link" size="sm" className="ml-5" onClick={() => createPermissionlessBankBundle()}>
                    Retry
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

const createTransaction = (
  ixs: TransactionInstruction[],
  payerKey: PublicKey,
  signers: Signer[],
  blockhash: string
): SolanaTransaction => {
  const message = new TransactionMessage({
    instructions: ixs,
    payerKey,
    recentBlockhash: blockhash,
  });

  const transaction = new VersionedTransaction(message.compileToV0Message([]));
  transaction.sign(signers);
  // TODO add proper steps
  const solanaTransaction = addTransactionMetadata(transaction, { signers, type: TransactionType.ADD_STAKED_BANK });

  return solanaTransaction;
};

const createSeeds = (): { tokenBankSeed: Keypair; stableBankSeed: Keypair; marginfiGroupSeed: Keypair } => {
  const tokenBankSeed = new Keypair();
  const stableBankSeed = new Keypair();
  const marginfiGroupSeed = new Keypair();

  return { tokenBankSeed, stableBankSeed, marginfiGroupSeed };
};

type VerifiedPoolData = {
  tokenMint: PublicKey;
  quoteMint: PublicKey;
  tokenSymbol: string;
  quoteSymbol: string;
  tokenConfig: { bankConfig: BankConfigOpt; oracleConfig: OracleConfigOpt | null };
  quoteConfig: { bankConfig: BankConfigOpt; oracleConfig: OracleConfigOpt | null };
};

const verifyPoolData = (poolData: PoolData | null): VerifiedPoolData | null => {
  if (!poolData || !poolData.token || !poolData.quoteToken || !poolData.tokenConfig || !poolData.quoteTokenConfig) {
    return null;
  }

  return {
    tokenMint: poolData.token.mint,
    quoteMint: poolData.quoteToken.mint,
    tokenSymbol: poolData.token.symbol,
    quoteSymbol: poolData.quoteToken.symbol,
    tokenConfig: poolData.tokenConfig,
    quoteConfig: poolData.quoteTokenConfig,
  };
};
