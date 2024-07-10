import Image from "next/image";
import Link from "next/link";

import { IconConfetti } from "@tabler/icons-react";

import { shortenAddress } from "@mrgnlabs/mrgn-common";

import { Button } from "~/components/ui/button";

import { FormValues } from "~/components/common/Pool/CreatePoolDialog";

import { IconLoader } from "~/components/ui/icons";
import { Separator } from "~/components/ui/separator";
import { Stepper, StepperItem, StepperWrapper, useStepper } from "~/components/ui/Stepper";
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
import { useWalletContext } from "~/hooks/useWalletContext";
import { useConnection } from "~/hooks/useConnection";
import { Keypair, Message, PublicKey, Transaction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { createMarginfiGroup, createPermissionlessBank } from "~/utils";
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
    setup: OracleSetup.PythEma,
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
    setup: OracleSetup.PythEma,
    keys: [],
  },
  oracleMaxAge: null,
  permissionlessBadDebtSettlement: null,
};

type stepperStatus = "default" | "success" | "error" | "loading";

interface CreatePoolLoadingProps {
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsCompleted: () => void;
  poolCreatedData: FormValues | null;
}

interface CreatePoolLoadingContainerProps extends CreatePoolLoadingProps {
  setStatus: React.Dispatch<React.SetStateAction<stepperStatus | undefined>>;
}

export const CreatePoolLoading = (props: CreatePoolLoadingProps) => {
  const steps = React.useMemo(
    () => [
      { label: "Step 1", description: "Creating group" },
      { label: "Step 2", description: "Creating USDC bank" },
      { label: "Step 3", description: `Creating ${props.poolCreatedData?.symbol} bank` },
    ],
    [props.poolCreatedData]
  );

  const [status, setStatus] = React.useState<stepperStatus>();

  return (
    <StepperWrapper
      initialStep={0}
      steps={steps}
      status={status}
      variant="default"
      labelOrientation="vertical"
      orientation="horizontal"
      isClickable={false}
    >
      <CreatePoolLoadingContainer {...props} setStatus={setStatus} />
    </StepperWrapper>
  );
};

type PoolCreationState = {
  marginfiClient?: MarginfiClient;
  marginfiGroupPk?: PublicKey;
  tokenBankSig?: string;
  stableBankSig?: string;
};

const CreatePoolLoadingContainer = ({
  poolCreatedData,
  setIsOpen,
  setIsCompleted,
  setStatus,
}: CreatePoolLoadingContainerProps) => {
  const { wallet } = useWalletContext();
  const { connection } = useConnection();
  const { nextStep, status, activeStep } = useStepper();
  const [priorityFee] = useUiStore((state) => [state.priorityFee]);

  const [poolCreation, setPoolCreation] = React.useState<PoolCreationState>();

  const initialized = React.useRef(false);

  const initializeClient = React.useCallback(async () => {
    const config = getConfig();
    const client = await MarginfiClient.fetch(config, wallet, connection);
    setPoolCreation((state) => ({ ...state, marginfiClient: client }));
    return client;
  }, [connection, wallet]);

  const createGroup = React.useCallback(
    async (marginfiClient: MarginfiClient) => {
      try {
        const marginfiGroup = await createMarginfiGroup({ marginfiClient });

        if (!marginfiGroup) throw new Error();

        return marginfiGroup;
      } catch (error) {
        setStatus("error");
      }
    },
    [setStatus]
  );

  const createBank = React.useCallback(
    async (marginfiClient: MarginfiClient, bankConfig: BankConfigOpt, mint: PublicKey, group: PublicKey) => {
      try {
        setStatus("loading");

        const sig = await createPermissionlessBank({
          marginfiClient,
          mint,
          bankConfig,
          group,
          admin: wallet.publicKey,
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

  const createTransaction = React.useCallback(async () => {
    if (!poolCreatedData) return;

    setStatus("loading");

    let client = poolCreation?.marginfiClient;
    if (!client) client = await initializeClient();

    let group = poolCreation?.marginfiGroupPk;
    if (!group) group = await createGroup(client);
    if (!group) return;
    setPoolCreation((state) => ({ ...state, group: group }));

    nextStep();

    if (!poolCreation?.stableBankSig) {
      const sig = await createBank(client, DEFAULT_USDC_BANK_CONFIG, USDC_MINT, group);
      if (!sig) return;
      setPoolCreation((state) => ({ ...state, stableBankSig: sig }));
    }
    nextStep();

    if (!poolCreation?.tokenBankSig) {
      const tokenMint = new PublicKey(poolCreatedData.mint);
      // token bank
      let tokenBankConfig = DEFAULT_TOKEN_BANK_CONFIG;

      tokenBankConfig.borrowLimit = new BigNumber(100); // todo: update this according to price
      tokenBankConfig.depositLimit = new BigNumber(10000); // todo: update this according to price
      tokenBankConfig.oracle = {
        setup: OracleSetup.PythEma,
        keys: [new PublicKey(poolCreatedData.oracle)],
      };

      const sig = await createBank(client, tokenBankConfig, tokenMint, group);
      if (!sig) return;
      setPoolCreation((state) => ({ ...state, tokenBankSig: sig }));
    }
    setIsCompleted();
  }, [
    createBank,
    createGroup,
    initializeClient,
    nextStep,
    poolCreatedData,
    poolCreation?.marginfiClient,
    poolCreation?.marginfiGroupPk,
    poolCreation?.stableBankSig,
    poolCreation?.tokenBankSig,
    setIsCompleted,
    setStatus,
  ]);

  return (
    <>
      <div className="text-center space-y-2 max-w-lg mx-auto">
        <h2 className="text-3xl font-medium">Creating a new pool</h2>
        <p className="text-lg text-muted-foreground">Executing transactions to setup token banks.</p>
      </div>
      <div className="space-y-8">
        <div className="relative w-full max-w-2xl mx-auto">
          <Stepper>
            <StepperItem
              action={
                <Button size={"sm"} onClick={() => createTransaction()}>
                  Retry
                </Button>
              }
            ></StepperItem>
            <StepperItem
              action={
                <Button size={"sm"} onClick={() => createTransaction()}>
                  Retry
                </Button>
              }
            ></StepperItem>
            <StepperItem
              action={
                <Button size={"sm"} onClick={() => createTransaction()}>
                  Retry
                </Button>
              }
            ></StepperItem>
          </Stepper>
        </div>

        <div className="text-center">
          <Button
            disabled={status !== "default"}
            onClick={() => {
              createTransaction();
            }}
          >
            Create Pool
          </Button>
        </div>
      </div>
    </>
  );
};
