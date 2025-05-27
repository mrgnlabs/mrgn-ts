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
  freezeBankConfigIx,
  Bank,
  makePoolAddBankIx,
} from "@mrgnlabs/marginfi-client-v2";
import { cn, getFeeAccount, createReferalTokenAccountIxs } from "@mrgnlabs/mrgn-utils";
import { addTransactionMetadata, SolanaTransaction, TransactionType } from "@mrgnlabs/mrgn-common";
import { useWallet } from "@mrgnlabs/mrgn-ui";

import { Button } from "~/components/ui/button";
import { useConnection } from "~/hooks/use-connection";
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
  const [activeStep, setActiveStep] = React.useState<number>(0);
  const [status, setStatus] = React.useState<StepperStatus>("default");

  const steps = React.useMemo(
    () => [
      { label: "Step 1", description: "Setting up oracles" },
      { label: "Step 2", description: "Saving token image data" },
      { label: "Step 3", description: "Generating transactions" },
      { label: "Step 4", description: "Indexing pool" },
      { label: "Step 5", description: "Executing transactions" },
      { label: "Step 6", description: "Finalizing pool" },
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

  const savePermissionlessPool = async (poolObject: {
    group: string;
    asset: string;
    quote: string;
    lut: string;
    admin: string;
  }) => {
    try {
      const formattedPoolObject = {
        base_bank: poolObject.asset,
        created_by: poolObject.admin,
        group: poolObject.group,
        lookup_tables: [poolObject.lut],
        quote_bank: poolObject.quote,
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
      const { tokenMint, quoteMint, tokenSymbol, quoteSymbol, tokenConfig, quoteConfig, tokenIcon, quoteIcon } =
        verifiedPoolData;

      setStatus("loading");

      // create client
      const client = await initializeClient();
      // create seeds
      const seeds = createSeeds();
      // create oracle ix
      const pullFeedIxs: {
        pullFeedIx: TransactionInstruction;
        feedSeed: Keypair;
      }[] = [];

      const updatedTokenBankConfig = { ...tokenConfig.bankConfig };
      const updatedQuoteBankConfig = { ...quoteConfig.bankConfig };

      let updatedTokenOracleConfig = { ...tokenConfig.oracleConfig };
      let updatedQuoteOracleConfig = { ...quoteConfig.oracleConfig };

      if (!updatedTokenOracleConfig?.keys || updatedTokenOracleConfig?.keys?.length === 0) {
        const oracleCreationToken = await initializeOracle(tokenMint, tokenSymbol);
        if (!oracleCreationToken) throw new Error("Oracle creation failed");
        updatedTokenOracleConfig = {
          setup: OracleSetup.SwitchboardPull,
          keys: [oracleCreationToken.feedPubkey],
        };
        pullFeedIxs.push(oracleCreationToken);
      }

      if (!updatedQuoteOracleConfig?.keys || updatedQuoteOracleConfig?.keys?.length === 0) {
        const oracleCreationQuote = await initializeOracle(quoteMint, quoteSymbol);
        if (!oracleCreationQuote) throw new Error("Oracle creation failed");
        updatedQuoteOracleConfig = {
          setup: OracleSetup.SwitchboardPull,
          keys: [oracleCreationQuote.feedPubkey],
        };
        pullFeedIxs.push(oracleCreationQuote);
      }

      setActiveStep(1);

      // upload images
      const uploadImageResponse = await uploadImage(tokenIcon, tokenMint.toBase58());
      if (!uploadImageResponse) {
        setStatus("error");
        console.error("Failed to upload image");
        return;
      }

      const uploadQuoteImageResponse = await uploadImage(quoteIcon, quoteMint.toBase58());
      if (!uploadQuoteImageResponse) {
        setStatus("error");
        console.error("Failed to upload image");
        return;
      }

      setActiveStep(2);

      // create group ix
      const groupIxWrapped = await client.makeCreateMarginfiGroupIx(seeds.marginfiGroupSeed.publicKey);

      // create bank ix wrapper (quote)
      const quoteBankIxWrapper = await makePoolAddBankIx(
        client.program,
        seeds.marginfiGroupSeed.publicKey,
        seeds.stableBankSeed.publicKey,
        wallet.publicKey,
        quoteMint,
        updatedQuoteBankConfig
      );

      // create bank ix wrapper (token)
      const tokenBankIxWrapper = await makePoolAddBankIx(
        client.program,
        seeds.marginfiGroupSeed.publicKey,
        seeds.tokenBankSeed.publicKey,
        wallet.publicKey,
        tokenMint,
        updatedTokenBankConfig
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

      const addOracleToQuoteBankIx = await addOracleToBanksIx({
        program: client.program,
        bankAddress: seeds.stableBankSeed.publicKey,
        feedId: updatedQuoteOracleConfig.keys[0],
        oracleKey: updatedQuoteOracleConfig.keys.length > 1 ? updatedQuoteOracleConfig.keys[1] : undefined,
        setup: updatedQuoteOracleConfig.setup,
        groupAddress: seeds.marginfiGroupSeed.publicKey,
        adminAddress: wallet.publicKey,
      });

      const addOracleToTokenBankIx = await addOracleToBanksIx({
        program: client.program,
        bankAddress: seeds.tokenBankSeed.publicKey,
        feedId: updatedTokenOracleConfig.keys[0],
        oracleKey: updatedTokenOracleConfig.keys.length > 1 ? updatedTokenOracleConfig.keys[1] : undefined,
        setup: updatedTokenOracleConfig.setup,
        groupAddress: seeds.marginfiGroupSeed.publicKey,
        adminAddress: wallet.publicKey,
      });

      // freeze banks
      const freezeStableBankIx = await freezeBankConfigIx(
        client.program,
        seeds.stableBankSeed.publicKey,
        updatedQuoteBankConfig
      );

      const freezeTokenBankIx = await freezeBankConfigIx(
        client.program,
        seeds.tokenBankSeed.publicKey,
        updatedTokenBankConfig
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
        referralTokenAccountIxs = await createReferalTokenAccountIxs(connection, wallet.publicKey, tokenMint);
      }

      // transactions
      const transactions: SolanaTransaction[] = [];
      const {
        value: { blockhash },
      } = await connection.getLatestBlockhashAndContext();

      if (pullFeedIxs.length <= 1) {
        // create lut & create group transaction
        // create oracle transaction
        pullFeedIxs.forEach((ix) => {
          transactions.push(createTransaction([ix.pullFeedIx], wallet.publicKey, [ix.feedSeed], blockhash));
        });
        transactions.push(
          createTransaction(
            [createLutIx, extendLutIx, ...groupIxWrapped.instructions],
            wallet.publicKey,
            [seeds.marginfiGroupSeed],
            blockhash
          )
        );
      } else {
        // this means there are 2 oracles that need to be created
        transactions.push(
          createTransaction(
            [pullFeedIxs[0].pullFeedIx, createLutIx, extendLutIx],
            wallet.publicKey,
            [pullFeedIxs[0].feedSeed],
            blockhash
          )
        );
        transactions.push(
          createTransaction(
            [pullFeedIxs[1].pullFeedIx, ...groupIxWrapped.instructions],
            wallet.publicKey,
            [pullFeedIxs[1].feedSeed, seeds.marginfiGroupSeed],
            blockhash
          )
        );
      }

      // create quote bank & referal token account transaction  ...referralTokenAccountIxs
      transactions.push(
        createTransaction(
          [...quoteBankIxWrapper.instructions, ...addOracleToQuoteBankIx.instructions],
          wallet.publicKey,
          [seeds.stableBankSeed, ...quoteBankIxWrapper.keys, ...addOracleToQuoteBankIx.keys],
          blockhash
        )
      );

      // create token bank transaction
      transactions.push(
        createTransaction(
          [...tokenBankIxWrapper.instructions, ...addOracleToTokenBankIx.instructions],
          wallet.publicKey,
          [seeds.tokenBankSeed, ...tokenBankIxWrapper.keys, ...addOracleToTokenBankIx.keys],
          blockhash
        )
      );

      transactions.push(
        createTransaction(
          [...freezeStableBankIx.instructions, ...freezeTokenBankIx.instructions],
          wallet.publicKey,
          [],
          blockhash
        )
      );

      setActiveStep(3);

      try {
        const response = await savePermissionlessPool({
          group: seeds.marginfiGroupSeed.publicKey.toBase58(),
          asset: seeds.tokenBankSeed.publicKey.toBase58(),
          quote: seeds.stableBankSeed.publicKey.toBase58(),
          lut: lutAddress.toBase58(),
          admin: wallet.publicKey.toBase58(),
        });
        console.log("Pool saved:", response);
      } catch (error) {
        console.error("Failed to save pool");
        console.error(error);
        throw error;
      }

      setActiveStep(4);

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
  }, [connection, initializeClient, initializeOracle, poolData, setCreatePoolState, setPoolData, wallet.publicKey]);

  React.useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      createPermissionlessBankBundle();
    }
  }, [createPermissionlessBankBundle]);

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
  tokenIcon: string;
  quoteIcon: string;
  tokenConfig: { bankConfig: BankConfigOpt; oracleConfig: OracleConfigOpt | null };
  quoteConfig: { bankConfig: BankConfigOpt; oracleConfig: OracleConfigOpt | null };
};

const verifyPoolData = (poolData: PoolData | null): VerifiedPoolData | null => {
  if (
    !poolData ||
    !poolData.token ||
    !poolData.quoteToken ||
    !poolData.tokenConfig ||
    !poolData.quoteTokenConfig ||
    !poolData.token.icon ||
    !poolData.quoteToken.icon
  ) {
    return null;
  }

  return {
    tokenMint: poolData.token.mint,
    quoteMint: poolData.quoteToken.mint,
    tokenSymbol: poolData.token.symbol,
    quoteSymbol: poolData.quoteToken.symbol,
    tokenConfig: poolData.tokenConfig,
    quoteConfig: poolData.quoteTokenConfig,
    tokenIcon: poolData.token.icon,
    quoteIcon: poolData.quoteToken.icon,
  };
};

const uploadImage = async (fileUrl: string, mint: string): Promise<boolean> => {
  try {
    // Fetch the file from the URL
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) throw new Error("Failed to fetch file from URL");

    // Convert the response to a Blob
    const fileBlob = await fileResponse.blob();
    const fileParts = fileUrl.split("/");
    const fileName = fileParts[fileParts.length - 1];
    const extension = fileName.split(".").pop() || "";
    const filename = `${mint}.${extension}`;

    // Prepare the upload request
    const response = await fetch(`/api/pool/addImage?filename=${filename}`, {
      method: "POST",
    });

    if (response.status === 409) return true;

    const { url, fields } = await response.json();
    const formData = new FormData();
    Object.entries({ ...fields, file: fileBlob }).forEach(([key, value]) => {
      formData.append(key, value as string | Blob);
    });

    // Upload the file
    const upload = await fetch(url, {
      method: "POST",
      body: formData,
    });

    return upload.ok;
  } catch (error) {
    console.error("Error uploading image:", error);
    return false;
  }
};
