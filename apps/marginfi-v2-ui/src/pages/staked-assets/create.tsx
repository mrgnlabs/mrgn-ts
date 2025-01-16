import React from "react";

import { useDropzone } from "react-dropzone";
import { IconPhoto, IconLoader2 } from "@tabler/icons-react";
import { cn, useIsMobile } from "@mrgnlabs/mrgn-utils";

import { PageHeading } from "~/components/common/PageHeading";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  findPoolMintAddressByVoteAccount,
  initializeStakedPoolTx,
} from "@mrgnlabs/marginfi-client-v2/dist/vendor/spl-single-pool";
import { useConnection } from "~/hooks/use-connection";
import { useWallet } from "~/components/wallet-v2/hooks";
import { PublicKey, Transaction } from "@solana/web3.js";
import { SINGLE_POOL_PROGRAM_ID } from "@mrgnlabs/mrgn-common";
import { useMrgnlendStore, useUiStore } from "~/store";
import { MarginfiClient } from "@mrgnlabs/marginfi-client-v2";

type CreateStakedAssetForm = {
  voteAccountKey: string;
  assetName: string;
  assetLogo: File | null;
};

export default function CreateStakedAssetPage() {
  const { connection } = useConnection();
  const { wallet } = useWallet();
  const [client] = useMrgnlendStore((state) => [state.marginfiClient]);
  const [broadcastType, priorityFees] = useUiStore((state) => [state.broadcastType, state.priorityFees]);

  const [form, setForm] = React.useState<CreateStakedAssetForm>({
    voteAccountKey: "",
    assetName: "",
    assetLogo: null,
  });
  const [isLoading, setIsLoading] = React.useState(false);
  const isMobile = useIsMobile();

  const onDrop = React.useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        setForm({ ...form, assetLogo: acceptedFiles[0] });
      }
    },
    [form]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif"],
    },
    maxFiles: 1,
  });

  const createdStakedAssetSplPool = React.useCallback(
    async (voteAccount: PublicKey, client: MarginfiClient) => {
      const solOracle = new PublicKey("7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE");

      const initSplPoolTx = await initializeStakedPoolTx(connection, wallet.publicKey, new PublicKey(voteAccount));
      const addBankIxs = await client.group.makeAddPermissionlessStakedBankIx(client.program, voteAccount, solOracle);
      const addBankTx = new Transaction().add(...addBankIxs.instructions);

      const txSignature = await client.processTransactions([initSplPoolTx, addBankTx], {
        //addBankTx
        broadcastType: broadcastType,
        ...priorityFees,
      });
    },
    [broadcastType, connection, priorityFees, wallet.publicKey]
  );

  const uploadImage = React.useCallback(async (file: File, mint: string) => {
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
  }, []);

  const handleSubmitForm = React.useCallback(async () => {
    if (!client) return;

    try {
      const txSignature = await createdStakedAssetSplPool(new PublicKey(form.voteAccountKey), client);
      if (form.assetLogo) {
        const mintAddress = findPoolMintAddressByVoteAccount(new PublicKey(form.voteAccountKey));
        await uploadImage(form.assetLogo, mintAddress.toBase58());
      }
    } catch (e) {
      console.error(e);
    }

    setIsLoading(true);
    console.log(form);

    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  }, [client, createdStakedAssetSplPool, form, uploadImage]);

  return (
    <div>
      <PageHeading
        heading="Staked Asset Banks"
        body={<p>Create a new staked asset bank and let stakers use their native stake as collateral.</p>}
      />
      <form
        className="flex flex-col gap-8 px-4 md:px-0"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmitForm();
        }}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Vote Account Key</Label>
          <Input
            required
            id="name"
            placeholder="Enter validator vote account public key"
            value={form.voteAccountKey}
            onChange={(e) => setForm({ ...form, voteAccountKey: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Asset Name</Label>
          <Input
            required
            id="name"
            placeholder="Enter asset ticker"
            value={form.assetName}
            onChange={(e) => setForm({ ...form, assetName: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="logo">
            Asset Logo <span className="text-xs text-muted-foreground">(optional)</span>
          </Label>
          <div
            className={cn(
              "flex gap-4 items-center cursor-pointer p-4 group rounded-lg transition-colors hover:bg-background-gray",
              isDragActive && "bg-background-gray-light"
            )}
            {...getRootProps()}
          >
            <div
              className={cn(
                "border flex items-center justify-center rounded-full w-16 h-16 bg-background-gray-light border-background-gray-light transition-colors text-center text-input",
                "group-hover:border-input group-hover:bg-input group-hover:text-primary",
                isDragActive && "border-input bg-input text-primary"
              )}
            >
              <input {...getInputProps()} />
              <IconPhoto size={24} />
            </div>
            <p className="text-sm text-muted-foreground">
              {form.assetLogo
                ? `File: ${form.assetLogo.name}`
                : isMobile
                ? "Tap to select an image"
                : "Drop an image here or click to select"}
            </p>
          </div>
        </div>
        <Button disabled={!form.voteAccountKey || !form.assetName || isLoading} type="submit" size="lg">
          {isLoading ? (
            <>
              <IconLoader2 size={16} className="animate-spin" />
              Creating Staked Asset Bank...
            </>
          ) : (
            "Create Staked Asset Bank"
          )}
        </Button>
      </form>
    </div>
  );
}
