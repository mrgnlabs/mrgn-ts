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

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

const DEFAULT_USDC_BANK_CONFIG: BankConfigOpt = {
  assetWeightInit: new BigNumber(1),
  assetWeightMaint: new BigNumber(1),

  liabilityWeightInit: new BigNumber(1.25),
  liabilityWeightMaint: new BigNumber(1.100000023841858),

  depositLimit: new BigNumber(200000000),
  borrowLimit: new BigNumber(200000000),
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

type CreatePoolSuccessProps = {
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  poolCreatedData: FormValues | null;
};

export const CreatePoolLoading = ({ poolCreatedData, setIsOpen }: CreatePoolSuccessProps) => {
  const { wallet } = useWalletContext();
  const { connection } = useConnection();

  const steps = [
    { label: "Step 1", description: "Building transaction" },
    { label: "Step 2", description: "Creating group" },
    { label: "Step 3", description: "Creating banks" },
  ];
  const { nextStep } = useStepper();

  const createTransactions = async () => {
    // if (!poolCreatedData) return;

    let poolCreatedData = {
      mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
      oracle: "8ihFLu5FimgTQ1Unh4dVyEHUGodJ5gJQCrQf4KUVB9bN",
    };

    const config = getConfig();

    // const tokenBankKeypair = Keypair.generate();
    // const usdcBankKeypair = Keypair.generate();
    const client = await MarginfiClient.fetch(config, wallet, connection);
    // const tokenMint = new PublicKey(poolCreatedData.mint);
    // let tokenBankConfig = DEFAULT_TOKEN_BANK_CONFIG;
    // console.log({ client });

    // config bank
    // tokenBankConfig.borrowLimit = new BigNumber(100); // todo: update this according to price
    // tokenBankConfig.depositLimit = new BigNumber(10000); // todo: update this according to price
    // tokenBankConfig.oracle = {
    //   setup: OracleSetup.PythEma,
    //   keys: [new PublicKey(poolCreatedData.oracle)],
    // };

    // const priorityFeeIx = makePriorityFeeIx(0.001);
    const groupKeypair = Keypair.generate();

    // const [key, ixs, signers] = await client.createMarginfiGroupIx();
    // const pubkey = await key;
    // const signers = [...ixs.keys, groupKeypair, signers];
    // const tx = new Transaction().add(...ixs.instructions);
    // const tx = new Transaction().add(...ixs.instructions);
    // const getLatestBlockhashAndContext = await connection.getLatestBlockhashAndContext();

    // new VersionedTransaction()
    // const sig = await client.processTransaction(tx, signers);
    // console.log({ groupIxs });
    // const tokenBankIxs = await client.group.makePoolAddBankIx(
    //   client.program,
    //   tokenBankKeypair.publicKey,
    //   tokenMint,
    //   tokenBankConfig,
    //   { admin: wallet.publicKey, groupAddress: groupKeypair.publicKey }
    // );
    // const usdcBankIxs = await client.group.makePoolAddBankIx(
    //   client.program,
    //   usdcBankKeypair.publicKey,
    //   USDC_MINT,
    //   DEFAULT_USDC_BANK_CONFIG,
    //   { admin: wallet.publicKey, groupAddress: groupKeypair.publicKey }
    // );
    // const signers = [
    //   ...groupIxs.keys,
    //   // ...tokenBankIxs.keys,
    //   // ...usdcBankIxs.keys,
    //   groupKeypair,
    //   // tokenBankKeypair,
    //   // usdcBankKeypair,
    // ];
    // const tx = new Transaction().add(
    //   // ...priorityFeeIx,
    //   ...groupIxs.instructions
    //   // ...tokenBankIxs.instructions,
    //   // ...usdcBankIxs.instructions
    // );

    // console.log({ tx, tax: tx.serialize() });

    console.log({ client });

    // const sig = await client.processTransaction(tx, signers);

    // poolCreatedData?.mint
  };

  return (
    <>
      <div className="text-center space-y-2 max-w-lg mx-auto">
        <h2 className="text-3xl font-medium">Creating a new pool</h2>
        <p className="text-lg text-muted-foreground">Executing transactions to setup token banks.</p>
      </div>
      <div className="space-y-8">
        <div className="relative w-full max-w-2xl mx-auto">
          <StepperWrapper
            initialStep={0}
            steps={steps}
            status="loading"
            variant="default"
            labelOrientation="vertical"
            orientation="horizontal"
            isClickable={false}
          >
            <Stepper>
              <StepperItem></StepperItem>
              <StepperItem></StepperItem>
              <StepperItem></StepperItem>
            </Stepper>
          </StepperWrapper>
        </div>

        <div>
          <Button onClick={() => createTransactions()}>test</Button>
        </div>
      </div>
    </>
  );
};
