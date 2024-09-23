import React from "react";

import {
  BankConfigOpt,
  MarginfiClient,
  OperationalState,
  OracleSetup,
  RiskTier,
  getConfig,
  makeBundleTipIx,
} from "@mrgnlabs/marginfi-client-v2";
import { IconLoader2, IconCheck, IconX } from "@tabler/icons-react";
import {
  Keypair,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  Signer,
  Connection,
} from "@solana/web3.js";
import BigNumber from "bignumber.js";
import * as sb from "@switchboard-xyz/on-demand";
import { CrossbarClient, decodeString } from "@switchboard-xyz/common";

import * as anchor from "@coral-xyz/anchor";

import { useUiStore, useTradeStore } from "~/store";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useConnection } from "~/hooks/useConnection";
import { cn, createMarginfiGroup, createPermissionlessBank, createPoolLookupTable } from "~/utils";

import { Button } from "~/components/ui/button";

import { PoolData, CreatePoolState } from "../types";

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

const DEFAULT_USDC_BANK_CONFIG: BankConfigOpt = {
  assetWeightInit: new BigNumber(0.9),
  assetWeightMaint: new BigNumber(0.95),

  liabilityWeightInit: new BigNumber(1.25),
  liabilityWeightMaint: new BigNumber(1.1),

  depositLimit: new BigNumber(1000000).multipliedBy(1e6), // 1,000,000 USDC
  borrowLimit: new BigNumber(250000).multipliedBy(1e6), // 250,000 USDC
  riskTier: RiskTier.Collateral,

  totalAssetValueInitLimit: new BigNumber(0),
  interestRateConfig: {
    // Curve Params
    optimalUtilizationRate: new BigNumber(0.8),
    plateauInterestRate: new BigNumber(0.1),
    maxInterestRate: new BigNumber(3),

    // Fees
    insuranceFeeFixedApr: new BigNumber(0),
    insuranceIrFee: new BigNumber(0),
    protocolFixedFeeApr: new BigNumber(0.01),
    protocolIrFee: new BigNumber(0.3),
  },
  operationalState: OperationalState.Operational,

  oracle: {
    setup: OracleSetup.PythPushOracle,
    keys: [
      new PublicKey("Gnt27xtC473ZT2Mw5u8wZ68Z3gULkSTb5DuxJy7eJotD"), // feed id
      new PublicKey("Dpw1EAVrSB1ibxiDQyTAW6Zip3J4Btk2x4SgApQCeFbX"), // oracle key
    ],
  },
  oracleMaxAge: 300,
  permissionlessBadDebtSettlement: null,
};

const DEFAULT_TOKEN_BANK_CONFIG: BankConfigOpt = {
  assetWeightInit: new BigNumber(0.65),
  assetWeightMaint: new BigNumber(0.8),

  liabilityWeightInit: new BigNumber(1.3),
  liabilityWeightMaint: new BigNumber(1.2),

  // this will be overwritten based on oracle price
  depositLimit: new BigNumber(0), // 1,000,000 / oracle price
  borrowLimit: new BigNumber(0), // 250,000 / oracle price
  riskTier: RiskTier.Collateral,

  totalAssetValueInitLimit: new BigNumber(0),
  interestRateConfig: {
    // Curve Params
    optimalUtilizationRate: new BigNumber(0.8),
    plateauInterestRate: new BigNumber(0.1),
    maxInterestRate: new BigNumber(3),

    // Fees
    insuranceFeeFixedApr: new BigNumber(0),
    insuranceIrFee: new BigNumber(0),
    protocolFixedFeeApr: new BigNumber(0.01),
    protocolIrFee: new BigNumber(0.3),
  },
  operationalState: OperationalState.Operational,

  oracle: {
    setup: OracleSetup.SwitchboardV2,
    keys: [new PublicKey("8pMJw6N3e1FDexoTMx1T1ComSB91tmQydFrmhmmnXZuV")],
  },
  oracleMaxAge: null,
  permissionlessBadDebtSettlement: null,
};

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

type PoolCreationState = {
  seeds?: {
    tokenBankSeed: Keypair;
    stableBankSeed: Keypair;
    marginfiGroupSeed: Keypair;
  };
  lutAddress?: PublicKey;
  marginfiClient?: MarginfiClient;
  marginfiGroupPk?: PublicKey;
  tokenBankPk?: PublicKey;
  stableBankPk?: PublicKey;
  oraclePk?: PublicKey;
};

export const CreatePoolLoading = ({ poolData, setPoolData, setCreatePoolState }: CreatePoolLoadingProps) => {
  const { wallet } = useWalletContext();
  const { connection } = useConnection();
  const [fetchTradeState] = useTradeStore((state) => [state.fetchTradeState]);
  const [priorityFee] = useUiStore((state) => [state.priorityFee]);
  const [activeStep, setActiveStep] = React.useState<number>(0);
  const [status, setStatus] = React.useState<StepperStatus>("default");

  const steps = React.useMemo(
    () => [
      { label: "Step 1", description: "Creating a switchboard oracle" },
      { label: "Step 2", description: "Generating transactions" },
      { label: "Step 3", description: "Executing transactions" },
      { label: "Step 4", description: "Finalizing pool" },
    ],
    []
  );

  const [poolCreation, setPoolCreation] = React.useState<PoolCreationState>();

  const initialized = React.useRef(false);

  const initializeClient = React.useCallback(async () => {
    const config = getConfig();

    const client = await MarginfiClient.fetch(config, wallet, connection);

    setPoolCreation((state) => ({ ...state, marginfiClient: client }));
    return client;
  }, [connection, wallet]);

  const createOracleIx = React.useCallback(
    async (tokenMint: PublicKey, symbol: string, client: MarginfiClient) => {
      // get switchboard onDemand program id

      try {
        const programId = await sb.getProgramId(connection);
        const provider = new anchor.AnchorProvider(connection, wallet, {});
        const crossbarClient = new CrossbarClient("https://crossbar.switchboard.xyz", /* verbose= */ true);
        const idl = await anchor.Program.fetchIdl(programId, provider);

        if (!idl) return;

        const onDemandProgram = new anchor.Program(idl, provider);

        const [pullFeed, feedSeed] = sb.PullFeed.generate(onDemandProgram);

        const feedPubkey = feedSeed.publicKey;

        const oracleTasks = sb.OracleJob.Task.create({
          valueTask: {
            big: "1",
          },
          divideTask: {
            job: {
              tasks: [
                {
                  jupiterSwapTask: {
                    inTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
                    outTokenAddress: tokenMint.toBase58(), // TOKEN
                    baseAmountString: "1",
                  },
                },
              ],
            },
          },
          multiplyTask: {
            job: {
              tasks: [
                {
                  oracleTask: {
                    pythAddress: "Gnt27xtC473ZT2Mw5u8wZ68Z3gULkSTb5DuxJy7eJotD", // PYTH USDC oracle
                  },
                },
              ],
            },
          },
        });

        const queueAccount = await sb.getDefaultQueue(connection.rpcEndpoint);
        const queue = queueAccount.pubkey;

        const oracleJob = sb.OracleJob.create({
          tasks: [oracleTasks],
        });

        const feedHash = (await crossbarClient.store(queue.toString(), [oracleJob])).feedHash;

        const feedHashBuffer = decodeString(feedHash);

        if (!feedHashBuffer) return;

        const conf = {
          name: `${symbol}/USD`, // the feed name (max 32 bytes)
          queue: new PublicKey(queue), // the queue of oracles to bind to
          maxVariance: 10.0, // allow 1% variance between submissions and jobs
          minResponses: 1, // minimum number of responses of jobs to allow
          numSignatures: 1, // number of signatures to fetch per update
          minSampleSize: 1, // minimum number of responses to sample for a result
          maxStaleness: 250, // maximum stale slots of responses to sample
          feedHash: feedHashBuffer,
        };

        const pullFeedIx = await pullFeed.initIx(conf);

        // const pullFeedTx = await sb.asV0Tx({
        //   connection,
        //   ixs: [pullFeedIx],
        //   payer: wallet.publicKey,
        //   signers: [feedSeed],
        //   computeUnitPrice: 75_000,
        //   computeUnitLimitMultiple: 1.3,
        // });

        if (!feedPubkey) throw new Error();
        return { feedPubkey, pullFeedIx, feedSeed };
      } catch (error) {
        setStatus("error");
        console.log("error creating oracle", error);
      }
    },
    [connection, wallet]
  );

  const createPermissionlessBankBundle = React.useCallback(async () => {
    setActiveStep(0);

    if (!poolData) return;

    // create client
    const client = await initializeClient();

    // create seeds
    const seeds = createSeeds();

    // create bundle tip ix
    const bundleTipIx = makeBundleTipIx(wallet.publicKey);

    // create oracle ix
    const oracleCreation = await createOracleIx(poolData.mint, poolData.symbol, client);

    if (!oracleCreation) throw new Error("Oracle creation failed");

    setActiveStep(1);

    // create group ix
    const groupIxWrapped = await client.makeCreateMarginfiGroupIx(seeds.marginfiGroupSeed.publicKey);

    // create lut ix
    const oracleKeys = [oracleCreation.feedPubkey, ...(DEFAULT_USDC_BANK_CONFIG.oracle?.keys ?? [])];
    const bankKeys = [seeds.stableBankSeed.publicKey, seeds.tokenBankSeed.publicKey];
    const { lutAddress, createLutIx, extendLutIx } = await createPoolLookupTable({
      client,
      oracleKeys,
      bankKeys,
      groupKey: seeds.marginfiGroupSeed.publicKey,
      walletKey: wallet.publicKey,
    });

    // create bank ix wrapper (stable)
    const stableBankIxWrapper = await client.group.makePoolAddBankIx(
      client.program,
      seeds.stableBankSeed.publicKey,
      USDC_MINT,
      DEFAULT_USDC_BANK_CONFIG,
      {
        admin: wallet.publicKey,
        groupAddress: seeds.marginfiGroupSeed.publicKey,
      }
    );

    let tokenBankConfig = DEFAULT_TOKEN_BANK_CONFIG;

    // TODO: create switchboard pull oracle
    // TODO: update limits according to oracle price / token decimals (currently using Retardio data)
    tokenBankConfig.borrowLimit = new BigNumber(11481056).multipliedBy(1e6);
    tokenBankConfig.depositLimit = new BigNumber(252870264).multipliedBy(1e6);
    tokenBankConfig.oracle = {
      setup: OracleSetup.SwitchboardV2,
      keys: [oracleCreation.feedPubkey],
    };

    // create bank ix wrapper (token)
    const tokenBankIxWrapper = await client.group.makePoolAddBankIx(
      client.program,
      seeds.tokenBankSeed.publicKey,
      poolData.mint,
      tokenBankConfig,
      {
        admin: wallet.publicKey,
        groupAddress: seeds.marginfiGroupSeed.publicKey,
      }
    );

    // transactions
    const transactions: VersionedTransaction[] = [];
    const {
      value: { blockhash },
    } = await connection.getLatestBlockhashAndContext();

    // bundle tip & create oracle transaction
    transactions.push(
      await createTransaction(
        [bundleTipIx, oracleCreation.pullFeedIx],
        wallet.publicKey,
        connection,
        [oracleCreation.feedSeed],
        blockhash
      )
    );

    // create lut & create group transaction
    transactions.push(
      await createTransaction(
        [createLutIx, extendLutIx, ...groupIxWrapped.instructions],
        wallet.publicKey,
        connection,
        [seeds.marginfiGroupSeed],
        blockhash
      )
    );

    // stable bank transaction
    transactions.push(
      await createTransaction(
        [...stableBankIxWrapper.instructions],
        wallet.publicKey,
        connection,
        [seeds.stableBankSeed, ...stableBankIxWrapper.keys],
        blockhash
      )
    );

    // token bank transaction
    transactions.push(
      await createTransaction(
        [...tokenBankIxWrapper.instructions],
        wallet.publicKey,
        connection,
        [seeds.tokenBankSeed, ...tokenBankIxWrapper.keys],
        blockhash
      )
    );

    setActiveStep(2);

    // transaction execution
    const sigs = client.processTransactions(transactions);

    setActiveStep(3);

    // update LUT GCP
    const cacheData = {
      groupAddress: seeds.marginfiGroupSeed.publicKey.toBase58(),
      lutAddress: lutAddress.toBase58(),
      usdcBankAddress: seeds.stableBankSeed.publicKey.toBase58(),
      tokenBankAddress: seeds.tokenBankSeed.publicKey.toBase58(),
      tokenName: poolData.name,
      tokenMint: poolData.mint,
      tokenSymbol: poolData.symbol,
      tokenImage: poolData.icon,
      tokenDecimals: poolData.decimals,
    };
    console.log("cache data", cacheData);
    const lutUpdateRes = await fetch(`/api/pool/create`, {
      method: "POST",
      body: JSON.stringify(cacheData),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!lutUpdateRes.ok) {
      console.error("Failed to update GCP caches");
      return;
    }

    setPoolData((state) => {
      if (!state) return null;
      return { ...state, group: seeds.marginfiGroupSeed.publicKey };
    });
    setCreatePoolState(CreatePoolState.SUCCESS);
    fetchTradeState({
      connection,
      wallet,
      refresh: true,
    });
  }, [
    connection,
    createOracleIx,
    fetchTradeState,
    initializeClient,
    poolData,
    setCreatePoolState,
    setPoolData,
    wallet,
  ]);

  const createTransaction = async (
    ixs: TransactionInstruction[],
    payerKey: PublicKey,
    connection: Connection,
    signers: Signer[],
    blockhashArg?: string
  ) => {
    let blockhash = blockhashArg;
    if (!blockhash) {
      blockhash = (await connection.getLatestBlockhashAndContext()).value.blockhash;
    }

    const message = new TransactionMessage({
      instructions: ixs,
      payerKey,
      recentBlockhash: blockhash,
    });

    const transaction = new VersionedTransaction(message.compileToV0Message());
    transaction.sign(signers);

    return transaction;
  };

  const createSeeds = () => {
    const tokenBankSeed = new Keypair();
    const stableBankSeed = new Keypair();
    const marginfiGroupSeed = new Keypair();

    return { tokenBankSeed, stableBankSeed, marginfiGroupSeed };
  };

  React.useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      // createTransaction();
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
