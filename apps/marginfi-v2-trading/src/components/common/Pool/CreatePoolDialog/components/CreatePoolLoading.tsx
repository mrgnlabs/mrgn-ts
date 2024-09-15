import React from "react";

import {
  BankConfigOpt,
  MarginfiClient,
  OperationalState,
  OracleSetup,
  RiskTier,
  getConfig,
} from "@mrgnlabs/marginfi-client-v2";
import { IconLoader2, IconCheck, IconX } from "@tabler/icons-react";
import { Keypair, PublicKey, TransactionInstruction } from "@solana/web3.js";
import BigNumber from "bignumber.js";

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
      { label: "Step 1", description: "Creating new marginfi group" },
      { label: "Step 2", description: "Configuring USDC bank" },
      { label: "Step 3", description: `Configuring ${poolData?.symbol} bank` },
      { label: "Step 4", description: "Finalizing pool" },
    ],
    [poolData]
  );

  const [poolCreation, setPoolCreation] = React.useState<PoolCreationState>();

  const initialized = React.useRef(false);

  const initializeClient = React.useCallback(async () => {
    const config = getConfig();

    const client = await MarginfiClient.fetch(config, wallet, connection);

    setPoolCreation((state) => ({ ...state, marginfiClient: client }));
    return client;
  }, [connection, wallet]);

  const createGroup = React.useCallback(
    async (marginfiClient: MarginfiClient, lutIxs: TransactionInstruction[], seed?: Keypair) => {
      try {
        const marginfiGroup = await createMarginfiGroup({
          marginfiClient,
          additionalIxs: lutIxs,
          seed,
        });

        if (!marginfiGroup) throw new Error();

        return marginfiGroup;
      } catch (error) {
        setStatus("error");
      }
    },
    [setStatus]
  );

  const createBank = React.useCallback(
    async (
      marginfiClient: MarginfiClient,
      bankConfig: BankConfigOpt,
      mint: PublicKey,
      group: PublicKey,
      seed?: Keypair
    ) => {
      try {
        setStatus("loading");

        const sig = await createPermissionlessBank({
          marginfiClient,
          mint,
          bankConfig,
          group,
          admin: wallet.publicKey,
          seed,
          priorityFee,
        });

        if (!sig) throw new Error();

        return sig;
      } catch (error) {
        setStatus("error");
      }
    },
    [wallet.publicKey, priorityFee, setStatus]
  );

  const createSeeds = React.useCallback(() => {
    const tokenBankSeed = new Keypair();
    const stableBankSeed = new Keypair();
    const marginfiGroupSeed = new Keypair();

    return { tokenBankSeed, stableBankSeed, marginfiGroupSeed };
  }, []);

  const createTransaction = React.useCallback(async () => {
    if (!poolData) return;
    setStatus("loading");

    let client = poolCreation?.marginfiClient;
    let seeds = poolCreation?.seeds;
    let group = poolCreation?.marginfiGroupPk;
    let lutAddress = poolCreation?.lutAddress;

    // create client
    if (!client) client = await initializeClient();

    //create seeds
    if (!seeds) seeds = createSeeds();
    setPoolCreation((state) => ({ ...state, seeds }));

    // TODO: Create SWB Pull oracle (currently usig RETARDIO)
    const swbOracle = new PublicKey("8pMJw6N3e1FDexoTMx1T1ComSB91tmQydFrmhmmnXZuV");

    // create group & LUT
    if (!group || !lutAddress) {
      console.log("creating lut");
      setActiveStep(0);
      const oracleKeys = [swbOracle, ...(DEFAULT_USDC_BANK_CONFIG.oracle?.keys ?? [])];
      const bankKeys = [seeds.stableBankSeed.publicKey, seeds.tokenBankSeed.publicKey];
      const {
        lutAddress: newLutAddress,
        createLutIx,
        extendLutIx,
      } = await createPoolLookupTable({
        client,
        oracleKeys,
        bankKeys,
        groupKey: seeds.marginfiGroupSeed.publicKey,
        walletKey: wallet.publicKey,
      });

      lutAddress = newLutAddress;

      console.log("creating group");
      group = await createGroup(client, [createLutIx, extendLutIx], seeds.marginfiGroupSeed);
      if (!group || !lutAddress) return;
    }

    setPoolCreation((state) => ({ ...state, marginfiGroupPk: group, lutAddress }));

    console.log("group created: ", group.toBase58());

    if (!poolCreation?.stableBankPk) {
      console.log("creating stable bank");
      setActiveStep(1);
      const sig = await createBank(client, DEFAULT_USDC_BANK_CONFIG, USDC_MINT, group, seeds.stableBankSeed);
      if (!sig) return;
      setPoolCreation((state) => ({ ...state, stableBankPk: seeds.stableBankSeed.publicKey }));
    }

    if (!poolCreation?.tokenBankPk) {
      setActiveStep(2);
      const tokenMint = new PublicKey(poolData.mint);
      // token bank
      let tokenBankConfig = DEFAULT_TOKEN_BANK_CONFIG;

      // TODO: create switchboard pull oracle
      // TODO: update limits according to oracle price / token decimals (currently using Retardio data)
      tokenBankConfig.borrowLimit = new BigNumber(11481056).multipliedBy(1e6);
      tokenBankConfig.depositLimit = new BigNumber(252870264).multipliedBy(1e6);
      tokenBankConfig.oracle = {
        setup: OracleSetup.SwitchboardV2,
        keys: [swbOracle],
      };

      const sig = await createBank(client, tokenBankConfig, tokenMint, group, seeds.tokenBankSeed);
      if (!sig) return;
      setPoolCreation((state) => ({ ...state, tokenBankPk: seeds.tokenBankSeed.publicKey }));
    }

    console.log("updating gcp caches");
    setActiveStep(3);
    const cacheData = {
      groupAddress: group.toBase58(),
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

    console.log("pool creation complete");
    console.log(cacheData);
    setPoolData((state) => {
      if (!state) return null;
      return { ...state, group };
    });
    setCreatePoolState(CreatePoolState.SUCCESS);
    fetchTradeState({
      connection,
      wallet,
      refresh: true,
    });
  }, [
    createBank,
    createGroup,
    initializeClient,
    poolData,
    poolCreation,
    setStatus,
    ,
    setActiveStep,
    createSeeds,
    setCreatePoolState,
    setPoolData,
    fetchTradeState,
    connection,
    wallet,
  ]);

  React.useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      createTransaction();
    }
  }, [createTransaction]);

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
                  <Button variant="link" size="sm" className="ml-5" onClick={() => createTransaction()}>
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
