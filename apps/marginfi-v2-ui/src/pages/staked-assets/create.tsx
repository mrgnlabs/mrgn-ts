import React from "react";

import { useRouter } from "next/router";

import { PublicKey, Transaction } from "@solana/web3.js";
import BN from "bn.js";

import {
  captureSentryException,
  cn,
  composeExplorerUrl,
  MultiStepToastHandle,
  useIsMobile,
} from "@mrgnlabs/mrgn-utils";
import { MarginfiClient, vendor } from "@mrgnlabs/marginfi-client-v2";
import { useWindowSize } from "@uidotdev/usehooks";
import Confetti from "react-confetti";

import { PageHeading } from "~/components/common/PageHeading";
import { useWallet } from "~/components/wallet-v2/hooks";
import { useConnection } from "~/hooks/use-connection";
import { useMrgnlendStore, useUiStore } from "~/store";
import { CreateStakedPoolDialog, CreateStakedPoolForm } from "~/components/common/create-staked-pool";

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
  const [client, stakedAssetBankInfos, fetchMrgnlendState] = useMrgnlendStore((state) => [
    state.marginfiClient,
    state.stakedAssetBankInfos,
    state.fetchMrgnlendState,
  ]);
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

  const validatorPubKeys = stakedAssetBankInfos
    .map((bank) => bank.meta.stakePool?.validatorVoteAccount)
    .filter((key) => key !== undefined) as PublicKey[];

  const createStakedAssetSplPoolTxn = React.useCallback(
    async (voteAccount: PublicKey, client: MarginfiClient) => {
      const solOracle = new PublicKey("7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE");
      const poolAddress = vendor.findPoolAddress(voteAccount);
      const poolAdderssInfo = await connection.getAccountInfo(poolAddress);
      let txns: Transaction[] = [];

      if (!poolAdderssInfo) {
        txns.push(await vendor.initializeStakedPoolTx(connection, wallet.publicKey, new PublicKey(voteAccount)));
      }

      const addBankIxs = await client.group.makeAddPermissionlessStakedBankIx(
        client.program,
        voteAccount,
        client.provider.publicKey,
        solOracle
      );
      txns.push(new Transaction().add(...addBankIxs.instructions));

      return txns;
    },
    [connection, wallet.publicKey]
  );

  const executeCreatedStakedAssetSplPoolTxn = React.useCallback(
    async (txns: Transaction[], client: MarginfiClient, multiStepToast: MultiStepToastHandle) => {
      const txSignature = await client.processTransactions(txns, {
        broadcastType: "RPC",
        ...priorityFees,
        callback(index, success, signature, stepsToAdvance) {
          success && multiStepToast.setSuccessAndNext(stepsToAdvance, signature, composeExplorerUrl(signature));
        },
      });

      multiStepToast.setSuccessAndNext(
        undefined,
        txSignature[txSignature.length - 1],
        composeExplorerUrl(txSignature[txSignature.length - 1])
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
        throw new AddMetadataError(`Failed to add metadata: ${response.statusText}`, true);
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

  const handleSumbitForm = (form: CreateStakedAssetForm) => {
    createStakedAsset(form);
  };

  const createStakedAsset = React.useCallback(
    async (
      form: CreateStakedAssetForm,
      retryOptions: {
        hasExecutedCreateStakedAssetSplPoolTxn: boolean;
        bankKey?: PublicKey;
        mintAddress?: PublicKey;
        txns?: Transaction[];
        multiStepToast?: MultiStepToastHandle;
      } = {
        hasExecutedCreateStakedAssetSplPoolTxn: false,
        bankKey: undefined,
        mintAddress: undefined,
        txns: undefined,
        multiStepToast: undefined,
      }
    ) => {
      if (!client) return;
      setIsLoading(true);

      if (!retryOptions.multiStepToast) {
        retryOptions.multiStepToast = new MultiStepToastHandle("Creating Staked Asset Bank", [
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
        retryOptions.txns = await createStakedAssetSplPoolTxn(new PublicKey(form.voteAccountKey), client);
      }

      let bankKey = retryOptions.bankKey;
      let mintAddress = retryOptions.mintAddress;

      try {
        if (!retryOptions.hasExecutedCreateStakedAssetSplPoolTxn || !bankKey || !mintAddress) {
          mintAddress = vendor.findPoolMintAddressByVoteAccount(new PublicKey(form.voteAccountKey));
          [bankKey] = PublicKey.findProgramAddressSync(
            [client.group.address.toBuffer(), mintAddress.toBuffer(), new BN(0).toArrayLike(Buffer, "le", 8)],
            client.program.programId
          );

          await executeCreatedStakedAssetSplPoolTxn(retryOptions.txns, client, retryOptions.multiStepToast);

          retryOptions.hasExecutedCreateStakedAssetSplPoolTxn = true;
          retryOptions.bankKey = bankKey;
          retryOptions.mintAddress = mintAddress;
        }

        await addMetadata(new PublicKey(form.voteAccountKey), bankKey, mintAddress, form.assetName, form.assetSymbol);

        retryOptions.multiStepToast.setSuccessAndNext();

        if (form.assetLogo) {
          await uploadImage(form.assetLogo, mintAddress.toBase58());
        }

        retryOptions.multiStepToast.setSuccess();
        setCompletedForm({ ...form, assetMint: mintAddress });
        setIsDialogOpen(true);
        fetchMrgnlendState();
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
    [client, createStakedAssetSplPoolTxn, executeCreatedStakedAssetSplPoolTxn, fetchMrgnlendState]
  );

  return (
    <div className="h-screen">
      <PageHeading
        heading="Staked Asset Banks"
        body={<p>Create a new staked asset bank and let stakers use their native stake as collateral.</p>}
      />
      <CreateStakedPoolForm isLoading={isLoading} onSubmit={handleSumbitForm} validatorPubKeys={validatorPubKeys} />
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
