import React from "react";

import { useRouter } from "next/router";

import { PublicKey, Transaction } from "@solana/web3.js";
import BN from "bn.js";

import {
  captureSentryException,
  cn,
  composeExplorerUrl,
  useIsMobile,
  validateAssetName,
  validateAssetSymbol,
} from "@mrgnlabs/mrgn-utils";
import { MarginfiClient, vendor } from "@mrgnlabs/marginfi-client-v2";
import { useWallet } from "@mrgnlabs/mrgn-ui";
import { useWindowSize } from "@uidotdev/usehooks";
import Confetti from "react-confetti";

import { PageHeading } from "~/components/common/PageHeading";
import { useConnection } from "~/hooks/use-connection";
import { useUiStore } from "~/store";
import { CreateStakedPoolDialog, CreateStakedPoolForm } from "~/components/common/create-staked-pool";
import { addTransactionMetadata, SolanaTransaction, TransactionType } from "@mrgnlabs/mrgn-common";
import { MultiStepToastController, toastManager } from "@mrgnlabs/mrgn-toasts";
import { useExtendedBanks, useMarginfiClient, useMetadata, useRefreshUserData } from "@mrgnlabs/mrgn-state";

type CreateStakedAssetForm = {
  voteAccountKey: string;
  assetName: string;
  assetSymbol: string;
  assetLogo: File | null;
  assetMint?: PublicKey;
};

class AddMetadataError extends Error {
  type: string;
  retry: boolean;

  constructor(message: string, retry: boolean = true) {
    super(message);
    this.type = "add_metadata";
    this.retry = retry;
  }
}

export default function CreateStakedAssetPage() {
  const router = useRouter();
  const { connection } = useConnection();
  const { wallet } = useWallet();
  const { marginfiClient } = useMarginfiClient(wallet);
  const { extendedBanks } = useExtendedBanks();

  const { data: metadata } = useMetadata();

  const refreshUserData = useRefreshUserData();

  const [broadcastType, priorityFees] = useUiStore((state) => [state.broadcastType, state.priorityFees]);
  const [completedForm, setCompletedForm] = React.useState<CreateStakedAssetForm>({
    voteAccountKey: "",
    assetName: "",
    assetSymbol: "",
    assetLogo: null,
    assetMint: PublicKey.default,
  });

  const { width, height } = useWindowSize();
  const isMobile = useIsMobile();

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const [isLoading, setIsLoading] = React.useState(false);

  const bankMetas = extendedBanks.map((bank) => ({
    tokenName: bank.meta.tokenName,
    tokenSymbol: bank.meta.tokenSymbol,
    tokenAddress: bank.meta.address.toBase58(),
  }));

  const validatorPubKeys: PublicKey[] = React.useMemo(
    () =>
      metadata?.bankMetadataMap
        ? Object.values(metadata.bankMetadataMap)
            .map((bank) => (bank.validatorVoteAccount ? new PublicKey(bank.validatorVoteAccount) : undefined))
            .filter((account): account is PublicKey => account !== undefined)
        : [],
    [metadata]
  );

  const createStakedAssetSplPoolTxn = React.useCallback(
    async (voteAccount: PublicKey, client: MarginfiClient) => {
      const solOracle = new PublicKey("7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE");
      const poolAddress = vendor.findPoolAddress(voteAccount);
      const poolAdderssInfo = await connection.getAccountInfo(poolAddress);
      let txns: SolanaTransaction[] = [];

      if (!poolAdderssInfo) {
        txns.push(
          addTransactionMetadata(
            await vendor.initializeStakedPoolTx(connection, wallet.publicKey, new PublicKey(voteAccount)),
            {
              type: TransactionType.INITIALIZE_STAKED_POOL,
            }
          )
        );
      }

      const addBankIxs = await client.group.makeAddPermissionlessStakedBankIx(
        client.program,
        voteAccount,
        client.provider.publicKey,
        solOracle
      );
      txns.push(
        addTransactionMetadata(new Transaction().add(...addBankIxs.instructions), {
          type: TransactionType.ADD_STAKED_BANK,
        })
      );

      return txns;
    },
    [connection, wallet.publicKey]
  );

  const executeCreatedStakedAssetSplPoolTxn = React.useCallback(
    async (txns: SolanaTransaction[], client: MarginfiClient, multiStepToast: MultiStepToastController) => {
      const txSignature = await client.processTransactions(txns, {
        broadcastType: "RPC",
        ...priorityFees,
        callback(index, success, signature, stepsToAdvance) {
          success && multiStepToast.successAndNext(stepsToAdvance, composeExplorerUrl(signature), signature);
        },
      });

      multiStepToast.successAndNext(
        undefined,
        composeExplorerUrl(txSignature[txSignature.length - 1]),
        txSignature[txSignature.length - 1]
      );
    },
    [priorityFees]
  );

  const uploadImage = async (file: File, mint: string) => {
    const fileParts = file.name.split(".");
    const extension = fileParts.length > 1 ? fileParts.pop() : "";
    const filename = `${mint}.${extension}`;

    const response = await fetch(`/api/stakedPools/addImage?filename=${filename}`, {
      method: "POST",
    });
    const { url, fields } = await response.json();
    const formData = new FormData();
    Object.entries({ ...fields, file }).forEach(([key, value]) => {
      formData.append(key, value as string | Blob);
    });
    const upload = await fetch(url, {
      method: "POST",
      body: formData,
    });

    return upload.ok;
  };

  const addMetadata = async (
    voteAccount: PublicKey,
    bankAddress: PublicKey,
    tokenAddress: PublicKey,
    tokenName: string,
    tokenSymbol: string
  ) => {
    try {
      const response = await fetch(`/api/stakedPools/addMetadata`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bankAddress: bankAddress.toBase58(),
          validatorVoteAccount: voteAccount.toBase58(),
          tokenAddress: tokenAddress.toBase58(),
          tokenName,
          tokenSymbol,
          tokenDecimals: 9,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new AddMetadataError(`Failed to add metadata: ${error.message}`, true);
      }
    } catch (error) {
      console.error("Error adding metadata:", error);

      captureSentryException(error, "Error adding metadata", {
        action: "createStakedAssetBank",
        bankAddress: bankAddress.toBase58(),
        validatorVoteAccount: voteAccount.toBase58(),
        tokenAddress: tokenAddress.toBase58(),
        tokenName,
        tokenSymbol,
        tokenDecimals: "9",
      });

      if (error instanceof AddMetadataError) {
        throw error;
      } else {
        throw new Error("An unexpected error occurred while adding metadata");
      }
    }
  };

  const createStakedAsset = React.useCallback(
    async (
      form: CreateStakedAssetForm,
      retryOptions: {
        hasExecutedCreateStakedAssetSplPoolTxn: boolean;
        bankKey?: PublicKey;
        mintAddress?: PublicKey;
        txns?: SolanaTransaction[];
        multiStepToast?: MultiStepToastController;
      } = {
        hasExecutedCreateStakedAssetSplPoolTxn: false,
        bankKey: undefined,
        mintAddress: undefined,
        txns: undefined,
        multiStepToast: undefined,
      }
    ) => {
      if (!marginfiClient) return;
      setIsLoading(true);

      if (!retryOptions.multiStepToast) {
        retryOptions.multiStepToast = toastManager.createMultiStepToast("Creating Staked Asset Bank", [
          { label: "Signing transaction" },
          { label: "Creating SPL stake pool" },
          { label: "Adding permissionless bank" },
          { label: "Uploading metadata" },
          ...(form.assetLogo ? [{ label: "Uploading logo" }] : []),
        ]);

        retryOptions.multiStepToast.start();
      } else {
        retryOptions.multiStepToast.resetAndStart();
      }

      try {
        new PublicKey(form.voteAccountKey);
      } catch (e) {
        retryOptions.multiStepToast.setFailed("Invalid vote account key");
        setIsLoading(false);
        return;
      }

      if (!retryOptions.txns || retryOptions.txns.length === 0) {
        retryOptions.txns = await createStakedAssetSplPoolTxn(new PublicKey(form.voteAccountKey), marginfiClient);
      }

      let bankKey = retryOptions.bankKey;
      let mintAddress = retryOptions.mintAddress;

      try {
        if (!retryOptions.hasExecutedCreateStakedAssetSplPoolTxn || !bankKey || !mintAddress) {
          mintAddress = vendor.findPoolMintAddressByVoteAccount(new PublicKey(form.voteAccountKey));
          [bankKey] = PublicKey.findProgramAddressSync(
            [marginfiClient.group.address.toBuffer(), mintAddress.toBuffer(), new BN(0).toArrayLike(Buffer, "le", 8)],
            marginfiClient.program.programId
          );
          const bankInfo = await connection.getAccountInfo(bankKey);

          if (!bankInfo) {
            await executeCreatedStakedAssetSplPoolTxn(retryOptions.txns, marginfiClient, retryOptions.multiStepToast);
          }

          retryOptions.hasExecutedCreateStakedAssetSplPoolTxn = true;
          retryOptions.bankKey = bankKey;
          retryOptions.mintAddress = mintAddress;
        }

        await addMetadata(new PublicKey(form.voteAccountKey), bankKey, mintAddress, form.assetName, form.assetSymbol);

        retryOptions.multiStepToast.successAndNext();

        if (form.assetLogo) {
          await uploadImage(form.assetLogo, mintAddress.toBase58());
        }

        retryOptions.multiStepToast.success();
        setCompletedForm({ ...form, assetMint: mintAddress });
        setIsDialogOpen(true);
        refreshUserData();
      } catch (e: any) {
        console.error(e);
        setIsLoading(false);
        let retry = undefined;
        if (e.retry) {
          if (e instanceof AddMetadataError && bankKey && mintAddress) {
            retry = () =>
              createStakedAsset(form, {
                hasExecutedCreateStakedAssetSplPoolTxn: true,
                bankKey: bankKey,
                mintAddress: mintAddress,
                txns: retryOptions.txns,
                multiStepToast: retryOptions.multiStepToast,
              });
          } else {
            retry = () => createStakedAsset(form, retryOptions);
          }
        }
        retryOptions.multiStepToast.setFailed(e.message ?? "Failed to create staked asset bank", retry);
      } finally {
        setIsLoading(false);
      }
    },
    [connection, createStakedAssetSplPoolTxn, executeCreatedStakedAssetSplPoolTxn, marginfiClient, refreshUserData]
  );

  const handleSumbitForm = React.useCallback(
    (form: CreateStakedAssetForm) => {
      const nameError = validateAssetName(form.assetName, bankMetas);
      const symbolError = validateAssetSymbol(form.assetSymbol, bankMetas);

      if (nameError) {
        throw new Error(nameError);
      }

      if (symbolError) {
        throw new Error(symbolError);
      }

      if (!form.assetLogo) {
        throw new Error("Asset logo is required");
      }

      createStakedAsset(form);
    },
    [bankMetas, createStakedAsset]
  );

  return (
    <div className="h-screen">
      <PageHeading
        heading="Staked Asset Banks"
        body={<p>Create a new staked asset bank and let stakers use their native stake as collateral.</p>}
      />
      <CreateStakedPoolForm
        isLoading={isLoading}
        onSubmit={handleSumbitForm}
        banks={bankMetas}
        validatorPubKeys={validatorPubKeys}
      />
      <CreateStakedPoolDialog
        isOpen={isDialogOpen}
        onClose={() => {
          router.push("/");
          setIsDialogOpen(false);
        }}
        assetName={completedForm.assetName}
        assetSymbol={completedForm.assetSymbol}
        assetMint={completedForm.assetMint}
        voteAccountKey={completedForm.voteAccountKey}
      />
      {isDialogOpen && (
        <Confetti
          width={width!}
          height={height! * 2}
          recycle={false}
          opacity={0.4}
          className={cn(isMobile ? "z-[80]" : "z-[80]")}
        />
      )}
    </div>
  );
}
