import React from "react";
import { PublicKey, Transaction } from "@solana/web3.js";

import { captureSentryException, composeExplorerUrl, MultiStepToastHandle } from "@mrgnlabs/mrgn-utils";
import { MarginfiClient, vendor } from "@mrgnlabs/marginfi-client-v2";

import { PageHeading } from "~/components/common/PageHeading";
import { useWallet } from "~/components/wallet-v2/hooks";
import { useConnection } from "~/hooks/use-connection";
import { useMrgnlendStore, useUiStore } from "~/store";
import { CreateStakedPoolDialog, CreateStakedPoolForm } from "~/components/common/create-staked-pool";
import BN from "bn.js";

type CreateStakedAssetForm = {
  voteAccountKey: string;
  assetName: string;
  assetSymbol: string;
  assetLogo: File | null;
};

export default function CreateStakedAssetPage() {
  const { connection } = useConnection();
  const { wallet } = useWallet();
  const [client] = useMrgnlendStore((state) => [state.marginfiClient]);
  const [broadcastType, priorityFees] = useUiStore((state) => [state.broadcastType, state.priorityFees]);
  const [completedForm, setCompletedForm] = React.useState({
    voteAccountKey: "",
    assetName: "",
  });

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const [isLoading, setIsLoading] = React.useState(false);

  const createStakedAssetSplPoolTxn = React.useCallback(
    async (voteAccount: PublicKey, client: MarginfiClient, multiStepToast: MultiStepToastHandle) => {
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
    [broadcastType, priorityFees]
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
        throw new Error(`Failed to add metadata: ${response.statusText}`);
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
      // do your work retry master
    }
  };

  const handleSumbitForm = (form: CreateStakedAssetForm) => {
    createStakedAsset(form);
  };

  const createStakedAsset = React.useCallback(
    async (form: CreateStakedAssetForm, txns?: Transaction[], multiStepToast?: MultiStepToastHandle) => {
      if (!client) return;

      setIsLoading(true);

      if (!multiStepToast) {
        multiStepToast = new MultiStepToastHandle("Creating Staked Asset Bank", [
          { label: "Signing transaction" },
          { label: "Creating SPL stake pool" },
          { label: "Adding permissionless bank" },
          { label: "Uploading metadata" },
          ...(form.assetLogo ? [{ label: "Uploading logo" }] : []),
        ]);

        multiStepToast.start();
      } else {
        multiStepToast.resetAndStart();
      }

      try {
        new PublicKey(form.voteAccountKey);
      } catch (e) {
        multiStepToast.setFailed("Invalid vote account key");
        setIsLoading(false);
        return;
      }

      if (!txns || txns.length === 0) {
        txns = await createStakedAssetSplPoolTxn(new PublicKey(form.voteAccountKey), client, multiStepToast);
      }

      try {
        const mintAddress = vendor.findPoolMintAddressByVoteAccount(new PublicKey(form.voteAccountKey));
        const [bankKey] = PublicKey.findProgramAddressSync(
          [client.group.address.toBuffer(), mintAddress.toBuffer(), new BN(0).toArrayLike(Buffer, "le", 8)],
          client.program.programId
        );

        await executeCreatedStakedAssetSplPoolTxn(txns, client, multiStepToast);

        await addMetadata(new PublicKey(form.voteAccountKey), bankKey, mintAddress, form.assetName, form.assetSymbol);

        multiStepToast.setSuccessAndNext();

        if (form.assetLogo) {
          await uploadImage(form.assetLogo, mintAddress.toBase58());
        }

        multiStepToast.setSuccess();
        setCompletedForm(form);
        setIsDialogOpen(true);
      } catch (e: any) {
        console.error(e);
        setIsLoading(false);
        let retry = undefined;
        if (e.retry) {
          retry = () => createStakedAsset(form, txns, multiStepToast);
        }
        multiStepToast.setFailed(e.message ?? "Failed to create staked asset bank", retry);
      } finally {
        setIsLoading(false);
      }
    },
    [client, createStakedAssetSplPoolTxn, executeCreatedStakedAssetSplPoolTxn]
  );

  return (
    <div>
      <PageHeading
        heading="Staked Asset Banks"
        body={<p>Create a new staked asset bank and let stakers use their native stake as collateral.</p>}
      />
      <CreateStakedPoolForm isLoading={isLoading} onSubmit={handleSumbitForm} />
      <CreateStakedPoolDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        asset={completedForm.assetName}
        voteAccountKey={completedForm.voteAccountKey}
      />
    </div>
  );
}
