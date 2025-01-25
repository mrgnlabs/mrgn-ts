import React from "react";

import { useDropzone } from "react-dropzone";
import { IconPhoto, IconLoader2 } from "@tabler/icons-react";
import { PublicKey } from "@solana/web3.js";

import { cn, useIsMobile } from "@mrgnlabs/mrgn-utils";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

type CreateStakedAssetForm = {
  voteAccountKey: string;
  assetName: string;
  assetSymbol: string;
  assetLogo: File | null;
};

type CreateStakedPoolFormProps = {
  isLoading: boolean;
  validatorPubKeys: PublicKey[];
  onSubmit: (form: CreateStakedAssetForm) => void;
};

export const CreateStakedPoolForm = ({ isLoading, validatorPubKeys, onSubmit }: CreateStakedPoolFormProps) => {
  const [form, setForm] = React.useState<CreateStakedAssetForm>({
    voteAccountKey: "",
    assetName: "",
    assetSymbol: "",
    assetLogo: null,
  });
  const [error, setError] = React.useState<string | null>(null);

  const isMobile = useIsMobile();

  const onDrop = React.useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        setForm({ ...form, assetLogo: acceptedFiles[0] });
      }
    },
    [form]
  );

  const handleValidatorPubkeyChange = (value: string) => {
    try {
      new PublicKey(value);
      const found = validatorPubKeys.find((key) => key.toBase58().toLowerCase() === value.toLowerCase());
      setError(found ? "Bank already exists" : null);
    } catch (e) {
      setError("Invalid vote account key");
    }

    setForm({ ...form, voteAccountKey: value });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/png": [".png"],
    },
    maxFiles: 1,
  });

  return (
    <form
      className="flex flex-col gap-8 px-4 md:px-0"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Vote Account Key</Label>
        <Input
          required
          id="name"
          placeholder="Enter validator vote account public key"
          value={form.voteAccountKey}
          onChange={(e) => handleValidatorPubkeyChange(e.target.value)}
          className={cn(error && "border-red-500")}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Asset Name</Label>
        <Input
          required
          id="name"
          placeholder="Enter asset name"
          value={form.assetName}
          onChange={(e) => setForm({ ...form, assetName: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Asset Symbol</Label>
        <Input
          required
          id="name"
          placeholder="Enter asset ticker"
          value={form.assetSymbol}
          onChange={(e) => setForm({ ...form, assetSymbol: e.target.value })}
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
      <Button disabled={!form.voteAccountKey || !form.assetName || error !== null || isLoading} type="submit" size="lg">
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
  );
};
