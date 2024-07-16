import { Button } from "~/components/ui/button";

import { FormValues } from "~/components/common/Pool/CreatePoolDialog";

import { IconLoader2, IconCheck, IconConfetti, IconX } from "@tabler/icons-react";
import {
  BankConfigOpt,
  MarginfiClient,
  OperationalState,
  OracleSetup,
  RiskTier,
  getConfig,
} from "@mrgnlabs/marginfi-client-v2";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useConnection } from "~/hooks/useConnection";
import { Keypair, PublicKey, TransactionInstruction } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { cn, createMarginfiGroup, createPermissionlessBank, createPoolLookupTable } from "~/utils";
import { useUiStore } from "~/store";
import React from "react";
import { showErrorToast } from "~/utils/toastUtils";
import { BankToken, bankTokens } from "./tokenSeeds";
import bs58 from "bs58";
import { NodeWallet, Wallet } from "@mrgnlabs/mrgn-common";
import wallet from "~/pages/api/user/wallet";

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
  marginfiGroupPk?: PublicKey;
  tokenBankPk?: PublicKey;
  stableBankPk?: PublicKey;
};

type LogLine = {
  type: "info" | "error" | "warning" | "loading";
  text: string;
};

export const CreatePoolLoading = ({ poolCreatedData, setIsOpen, setIsCompleted }: CreatePoolLoadingProps) => {
  const { connection } = useConnection();
  const [priorityFee] = useUiStore((state) => [state.priorityFee]);
  const [activeStep, setActiveStep] = React.useState<number>(0);
  // const [status, setStatus] = React.useState<StepperStatus>("default");
  const [logs, setLogs] = React.useState<LogLine[]>([]);
  const [client, setClient] = React.useState<MarginfiClient>();

  const steps = React.useMemo(
    () => [
      { label: "Step 1", description: "Creating new marginfi group" },
      { label: "Step 2", description: "Configuring USDC bank" },
      { label: "Step 3", description: `Configuring ${poolCreatedData?.symbol} bank` },
    ],
    [poolCreatedData]
  );

  const [poolCreationState, setPoolCreationState] = React.useState<PoolCreationState[]>();

  const initialized = React.useRef(false);

  // React.useEffect(() => {
  //   if (!initialized.current) {
  //     initialized.current = true;
  //     createTransaction();
  //   }
  // }, []);

  const initializeClient = React.useCallback(
    async (wallet: Wallet) => {
      const config = getConfig();

      const client = await MarginfiClient.fetch(config, wallet, connection);
      return client;
    },
    [connection]
  );

  const createGroup = React.useCallback(
    async (marginfiClient: MarginfiClient, lutIxs: TransactionInstruction[], seed?: Keypair) => {
      const marginfiGroup = await createMarginfiGroup({ marginfiClient, additionalIxs: lutIxs, seed });

      if (!marginfiGroup) throw new Error();

      return marginfiGroup;
    },
    []
  );

  const createBank = React.useCallback(
    async (
      marginfiClient: MarginfiClient,
      bankConfig: BankConfigOpt,
      mint: PublicKey,
      group: PublicKey,
      wallet: Wallet,
      seed?: Keypair
    ) => {
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
    },
    [priorityFee]
  );

  const createSeeds = React.useCallback(() => {
    const tokenBankSeed = new Keypair();
    const stableBankSeed = new Keypair();
    const marginfiGroupSeed = new Keypair();

    return { tokenBankSeed, stableBankSeed, marginfiGroupSeed };
  }, []);

  const createTransactions = async () => {
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    const keypair = process.env.NEXT_PUBLIC_WALLET_KEY;
    // console.log({ por: process.env });
    if (!keypair) {
      setLogs((state) => [...state, { type: "error", text: "NEXT_PUBLIC_WALLET_KEY env var not defined." }]);
      showErrorToast("NEXT_PUBLIC_WALLET_KEY env var not defined");
      return;
    }
    const wallet = new NodeWallet(Keypair.fromSecretKey(new Uint8Array(JSON.parse(keypair))));
    let newClient = client;
    if (!newClient) {
      newClient = await initializeClient(wallet);
      setClient(newClient);
      setLogs((state) => [...state, { type: "info", text: "Initializing marginfi client." }]);
    }

    const pools = bankTokens;
    const poolsLength = pools.length;
    setLogs((state) => [...state, { type: "info", text: `Loaded ${poolsLength} pools` }]);
    let result = [];

    for (let x = 0; x < poolsLength; x++) {
      const pool = pools[x];
      const { poolCreation: updatedPoolState, isFailed } = await createTransaction(newClient, wallet, pool, undefined);

      result.push(updatedPoolState);

      if (isFailed) {
        break;
      }
    }

    console.log({
      pools: result.map((x) => ({
        group: x?.marginfiGroupPk?.toBase58(),
        lut: x?.lutAddress?.toBase58(),
        tokenBank: x?.tokenBankPk?.toBase58(),
        stableBank: x?.stableBankPk?.toBase58(),
      })),
    });
  };

  const createTransaction = React.useCallback(
    async (client: MarginfiClient, wallet: Wallet, pool: BankToken, poolCreationArg: PoolCreationState | undefined) => {
      let poolCreation = poolCreationArg;

      setLogs((state) => [...state, { type: "info", text: `Creating pool for ${pool.token}` }]);

      try {
        let seeds = poolCreation?.seeds;
        let group = poolCreation?.marginfiGroupPk;
        let lutAddress = poolCreation?.lutAddress;

        //create seeds
        if (!seeds) seeds = createSeeds();
        poolCreation = { ...poolCreation, seeds };

        // create group & LUT
        if (!group || !lutAddress) {
          setActiveStep(0);
          const oracleKeys = [new PublicKey(pool.oracle), ...(DEFAULT_USDC_BANK_CONFIG.oracle?.keys ?? [])];
          const bankKeys = [seeds.stableBankSeed.publicKey, seeds.tokenBankSeed.publicKey];
          setLogs((state) => [...state, { type: "loading", text: `Generating lookuptable` }]);

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

          setLogs((state) => [...state, { type: "info", text: `Lookuptable created: ${newLutAddress.toBase58()}` }]);
          // throw new Error();

          lutAddress = newLutAddress;
          setLogs((state) => [
            ...state,
            { type: "loading", text: `Executing transaction for lookup & group creation.` },
          ]);

          group = await createGroup(client, [createLutIx, extendLutIx], seeds.marginfiGroupSeed);

          setLogs((state) => [
            ...state,
            { type: "info", text: `Transaction executed for group: ${group?.toBase58()}.` },
          ]);

          if (!group || !lutAddress) throw new Error();
        } else {
          setLogs((state) => [...state, { type: "info", text: `Skipping group creation` }]);
        }

        poolCreation = { ...poolCreation, marginfiGroupPk: group, lutAddress };

        if (!poolCreation?.stableBankPk) {
          setActiveStep(1);

          setLogs((state) => [
            ...state,
            {
              type: "loading",
              text: `Executing transaction for USDC bank creation (bank: ${seeds.stableBankSeed.publicKey.toBase58()}).`,
            },
          ]);

          const sig = await createBank(
            client,
            DEFAULT_USDC_BANK_CONFIG,
            USDC_MINT,
            group,
            wallet,
            seeds.stableBankSeed
          );
          if (!sig) throw new Error();

          setLogs((state) => [...state, { type: "info", text: `Transaction executed, sig: ${sig}.` }]);

          poolCreation = { ...poolCreation, stableBankPk: seeds.stableBankSeed.publicKey };
        } else {
          setLogs((state) => [...state, { type: "info", text: `Skipping stable bank creation` }]);
        }

        if (!poolCreation?.tokenBankPk) {
          setActiveStep(2);
          const tokenMint = new PublicKey(pool.token);
          // token bank
          let tokenBankConfig = DEFAULT_TOKEN_BANK_CONFIG;

          tokenBankConfig.borrowLimit = new BigNumber(pool.borrowLimit ?? 100); // todo: update this according to price
          tokenBankConfig.depositLimit = new BigNumber(pool.depositLimit ?? 10000); // todo: update this according to price
          tokenBankConfig.oracle = {
            setup: OracleSetup.PythEma,
            keys: [new PublicKey(pool.oracle)],
          };

          setLogs((state) => [
            ...state,
            {
              type: "loading",
              text: `Executing transaction for token bank creation (bank: ${seeds.tokenBankSeed.publicKey.toBase58()}).`,
            },
          ]);

          const sig = await createBank(client, tokenBankConfig, tokenMint, group, wallet, seeds.tokenBankSeed);

          setLogs((state) => [...state, { type: "info", text: `Transaction executed, sig: ${sig}.` }]);

          if (!sig) throw new Error();
          poolCreation = { ...poolCreation, tokenBankPk: seeds.tokenBankSeed.publicKey };
        } else {
          setLogs((state) => [...state, { type: "info", text: `Skipping token bank creation` }]);
        }
      } catch (error) {
        setLogs((state) => [
          ...state,
          {
            type: "error",
            text: `Transaction failed, try again.`,
          },
        ]);
        return { poolCreation, isFailed: true };
      } finally {
        return { poolCreation, isFailed: false };
      }
    },
    [createBank, createGroup, createSeeds]
  );

  return (
    <>
      <div className="text-center space-y-2 max-w-lg mx-auto">
        <h2 className="text-3xl font-medium">Creating new pools</h2>
        <p className="text-lg text-muted-foreground">Executing transactions to setup token banks.</p>
      </div>
      <div className="flex flex-col gap-1 relative w-full mx-auto bg-accent pl-4 pr-3 py-2 h-80 overflow-y-scroll rounded-lg text-muted-foreground">
        {logs.map((log, idx) => {
          let LogText;

          switch (log.type) {
            case "error":
              LogText = <div className="text-error">{log.text}</div>;
              break;
            case "loading":
              LogText = <div className="font-bold">{log.text}</div>;
              break;
            default:
              LogText = <div>{log.text}</div>;
              break;
          }

          return (
            <div key={idx} className="flex gap-2">
              <div className="">{">"}</div>
              {LogText}
            </div>
          );
        })}
      </div>
      <Button className="w-20 mx-auto" onClick={() => createTransactions()}>
        Create
      </Button>
    </>
  );
};
