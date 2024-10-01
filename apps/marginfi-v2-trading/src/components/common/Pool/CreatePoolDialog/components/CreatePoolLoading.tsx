import { Button } from "~/components/ui/button";

import { FormValues } from "~/components/common/Pool/CreatePoolDialog";

import { IconLoader2, IconCheck, IconConfetti, IconX } from "@tabler/icons-react";
import {
  BankConfigOpt,
  MarginfiClient,
  MarginfiGroup,
  OperationalState,
  OracleSetup,
  RiskTier,
  getConfig,
  makePriorityFeeIx,
} from "@mrgnlabs/marginfi-client-v2";
import { cn } from "@mrgnlabs/mrgn-utils";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { useConnection } from "~/hooks/useConnection";
import {
  Keypair,
  Message,
  PublicKey,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { createMarginfiGroup, createPermissionlessBank, createPoolLookupTable } from "~/utils";
import { useUiStore } from "~/store";
import React from "react";

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

const DEFAULT_USDC_BANK_CONFIG: BankConfigOpt = {
  assetWeightInit: new BigNumber(1),
  assetWeightMaint: new BigNumber(1),

  liabilityWeightInit: new BigNumber(1.25),
  liabilityWeightMaint: new BigNumber(1.1),

  depositLimit: new BigNumber(10000), //new BigNumber(200000000),
  borrowLimit: new BigNumber(100), // new BigNumber(200000000),
  riskTier: RiskTier.Collateral,

  totalAssetValueInitLimit: new BigNumber(0),
  interestRateConfig: {
    // Curve Params
    optimalUtilizationRate: new BigNumber(0.85),
    plateauInterestRate: new BigNumber(0.1),
    maxInterestRate: new BigNumber(3),

    // Fees
    insuranceFeeFixedApr: new BigNumber(0),
    insuranceIrFee: new BigNumber(0),
    protocolFixedFeeApr: new BigNumber(0.01),
    protocolIrFee: new BigNumber(0.05),
  },
  operationalState: OperationalState.Operational,

  oracle: {
    setup: OracleSetup.PythLegacy,
    keys: [new PublicKey("Gnt27xtC473ZT2Mw5u8wZ68Z3gULkSTb5DuxJy7eJotD")],
  },
  oracleMaxAge: 300,
  permissionlessBadDebtSettlement: null,
};

const DEFAULT_TOKEN_BANK_CONFIG: BankConfigOpt = {
  assetWeightInit: new BigNumber(0.5),
  assetWeightMaint: new BigNumber(0.64),

  liabilityWeightInit: new BigNumber(1.3),
  liabilityWeightMaint: new BigNumber(1.2),

  depositLimit: new BigNumber(10000),
  borrowLimit: new BigNumber(100),
  riskTier: RiskTier.Collateral,

  totalAssetValueInitLimit: new BigNumber(0),
  interestRateConfig: {
    // Curve Params
    optimalUtilizationRate: new BigNumber(0.8),
    plateauInterestRate: new BigNumber(0.2),
    maxInterestRate: new BigNumber(4),

    // Fees
    insuranceFeeFixedApr: new BigNumber(0),
    insuranceIrFee: new BigNumber(0),
    protocolFixedFeeApr: new BigNumber(0.01),
    protocolIrFee: new BigNumber(0.05),
  },
  operationalState: OperationalState.Operational,

  oracle: {
    setup: OracleSetup.PythLegacy,
    keys: [],
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
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsCompleted: ({
    tokenBankPk,
    stableBankPk,
    groupPk,
    lutAddress,
  }: {
    tokenBankPk: PublicKey;
    stableBankPk: PublicKey;
    groupPk: PublicKey;
    lutAddress: PublicKey;
  }) => void;
  poolCreatedData: FormValues | null;
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

export const CreatePoolLoading = ({ poolCreatedData, setIsOpen, setIsCompleted }: CreatePoolLoadingProps) => {
  const { wallet } = useWallet();
  const { connection } = useConnection();
  const [priorityFee] = useUiStore((state) => [state.priorityFee]);
  const [activeStep, setActiveStep] = React.useState<number>(0);
  const [status, setStatus] = React.useState<StepperStatus>("default");

  const steps = React.useMemo(
    () => [
      { label: "Step 1", description: "Creating new marginfi group" },
      { label: "Step 2", description: "Configuring USDC bank" },
      { label: "Step 3", description: `Configuring ${poolCreatedData?.symbol} bank` },
    ],
    [poolCreatedData]
  );

  const [poolCreation, setPoolCreation] = React.useState<PoolCreationState>();

  const initialized = React.useRef(false);

  React.useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      createTransaction();
    }
  }, []);

  const initializeClient = React.useCallback(async () => {
    const config = getConfig();

    const client = await MarginfiClient.fetch(config, wallet, connection);

    setPoolCreation((state) => ({ ...state, marginfiClient: client }));
    return client;
  }, [connection, wallet]);

  const createGroup = React.useCallback(
    async (marginfiClient: MarginfiClient, lutIxs: TransactionInstruction[], seed?: Keypair) => {
      try {
        const marginfiGroup = await createMarginfiGroup({ marginfiClient, additionalIxs: lutIxs, seed });

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
    if (!poolCreatedData) return;
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

    // create group & LUT
    if (!group || !lutAddress) {
      setActiveStep(0);
      const oracleKeys = [new PublicKey(poolCreatedData.oracle), ...(DEFAULT_USDC_BANK_CONFIG.oracle?.keys ?? [])];
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
      group = await createGroup(client, [createLutIx, extendLutIx], seeds.marginfiGroupSeed);
      if (!group || !lutAddress) return;
    }

    setPoolCreation((state) => ({ ...state, marginfiGroupPk: group, lutAddress }));

    if (!poolCreation?.stableBankPk) {
      setActiveStep(1);
      const sig = await createBank(client, DEFAULT_USDC_BANK_CONFIG, USDC_MINT, group, seeds.stableBankSeed);
      if (!sig) return;
      setPoolCreation((state) => ({ ...state, stableBankPk: seeds.stableBankSeed.publicKey }));
    }

    if (!poolCreation?.tokenBankPk) {
      setActiveStep(2);
      const tokenMint = new PublicKey(poolCreatedData.mint);
      // token bank
      let tokenBankConfig = DEFAULT_TOKEN_BANK_CONFIG;

      tokenBankConfig.borrowLimit = new BigNumber(100); // todo: update this according to price
      tokenBankConfig.depositLimit = new BigNumber(10000); // todo: update this according to price
      tokenBankConfig.oracle = {
        setup: OracleSetup.PythLegacy,
        keys: [new PublicKey(poolCreatedData.oracle)],
      };

      const sig = await createBank(client, tokenBankConfig, tokenMint, group, seeds.tokenBankSeed);
      if (!sig) return;
      setPoolCreation((state) => ({ ...state, tokenBankPk: seeds.tokenBankSeed.publicKey }));
    }

    setIsCompleted({
      groupPk: seeds.marginfiGroupSeed.publicKey,
      stableBankPk: seeds.stableBankSeed.publicKey,
      tokenBankPk: seeds.tokenBankSeed.publicKey,
      lutAddress,
    });
  }, [
    createBank,
    createGroup,
    initializeClient,
    poolCreatedData,
    poolCreation?.marginfiClient,
    poolCreation?.marginfiGroupPk,
    poolCreation?.stableBankPk,
    poolCreation?.tokenBankPk,
    setIsCompleted,
    setStatus,
  ]);

  return (
    <>
      <div className="text-center space-y-2 max-w-lg mx-auto">
        <h2 className="text-3xl font-medium">Creating a new pool</h2>
        <p className="text-lg text-muted-foreground">Executing transactions to setup token banks.</p>
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
