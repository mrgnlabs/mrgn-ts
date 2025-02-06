import React from "react";

import { useDropzone } from "react-dropzone";
import { IconPhoto, IconLoader2 } from "@tabler/icons-react";
import { PublicKey } from "@solana/web3.js";

import { cn, useIsMobile, validateAssetName, validateAssetSymbol, validateVoteAccount } from "@mrgnlabs/mrgn-utils";
import { BankMetadata } from "@mrgnlabs/mrgn-common";

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
  banks: BankMetadata[];
  validatorPubKeys: PublicKey[];
  onSubmit: (form: CreateStakedAssetForm) => void;
};

export const CreateStakedPoolForm = ({ isLoading, banks, validatorPubKeys, onSubmit }: CreateStakedPoolFormProps) => {
  const [form, setForm] = React.useState<CreateStakedAssetForm>({
    voteAccountKey: "",
    assetName: "",
    assetSymbol: "",
    assetLogo: null,
  });
  const [errors, setErrors] = React.useState<{ [key: string]: string | null }>({
    voteAccountKey: null,
    assetName: null,
    assetSymbol: null,
    assetLogo: null,
  });
  const [touched, setTouched] = React.useState<{ [key: string]: boolean }>({
    voteAccountKey: false,
    assetName: false,
    assetSymbol: false,
    assetLogo: false,
  });

  const isMobile = useIsMobile();

  const onDrop = React.useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file && file.size > 1 * 1024 * 1024) {
        setErrors({ ...errors, assetLogo: "File size must be less than 1MB" });
        return;
      }
      setForm({ ...form, assetLogo: file });
      setErrors({ ...errors, assetLogo: null });
    },
    [form, errors]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/png": [".png"],
    },
    maxFiles: 1,
    maxSize: 1 * 1024 * 1024, // 1MB
  });

  const handleValidatorPubkeyChange = (value: string) => {
    setForm({ ...form, voteAccountKey: value });
    setErrors({ ...errors, voteAccountKey: validateVoteAccount(value, validatorPubKeys) });
  };

  return (
    <form
      className="flex flex-col gap-8 px-4 md:px-0"
      onSubmit={(e) => {
        e.preventDefault();
        if (!form.assetLogo) {
          setErrors({ ...errors, assetLogo: "Asset logo is required" });
          return;
        }
        onSubmit(form);
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="voteAccountKey">Vote Account Key</Label>
        <Input
          required
          id="voteAccountKey"
          placeholder="Enter validator vote account public key"
          value={form.voteAccountKey}
          onChange={(e) => handleValidatorPubkeyChange(e.target.value)}
          onBlur={() => setTouched({ ...touched, voteAccountKey: true })}
          className={cn(touched.voteAccountKey && errors.voteAccountKey && "border-red-500")}
        />
        {touched.voteAccountKey && errors.voteAccountKey && (
          <p className="text-xs text-red-500">{errors.voteAccountKey}</p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="assetName">Asset Name</Label>
        <Input
          required
          id="assetName"
          maxLength={24}
          placeholder="Enter asset name"
          value={form.assetName}
          onChange={(e) => {
            const value = e.target.value;
            setForm({ ...form, assetName: value });
            setErrors({ ...errors, assetName: validateAssetName(value, banks) });
          }}
          onBlur={() => setTouched({ ...touched, assetName: true })}
          className={cn(touched.assetName && errors.assetName && "border-red-500")}
        />
        {touched.assetName && errors.assetName && <p className="text-xs text-red-500">{errors.assetName}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="assetSymbol">Asset Symbol</Label>
        <Input
          required
          id="assetSymbol"
          maxLength={10}
          placeholder="Enter asset ticker"
          value={form.assetSymbol}
          onChange={(e) => {
            const value = e.target.value;
            setForm({ ...form, assetSymbol: value });
            setErrors({ ...errors, assetSymbol: validateAssetSymbol(value, banks) });
          }}
          onBlur={() => setTouched({ ...touched, assetSymbol: true })}
          className={cn(touched.assetSymbol && errors.assetSymbol && "border-red-500")}
        />
        {touched.assetSymbol && errors.assetSymbol && <p className="text-xs text-red-500">{errors.assetSymbol}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="logo">
          Asset Logo <span className="text-xs text-muted-foreground">(optional)</span>
        </Label>
        <div
          className={cn(
            "flex gap-4 items-center cursor-pointer p-4 group rounded-lg transition-colors bg-background-gray hover:bg-background-gray-light",
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
          <p className="text-sm">
            {form.assetLogo ? (
              `File: ${form.assetLogo.name}`
            ) : isMobile ? (
              "Tap to select an image"
            ) : (
              <div>
                <p>Drop a PNG image here or click to select</p>
                <ul className="text-xs text-muted-foreground">
                  <li>Supported file types: PNG</li>
                  <li>Max file size: 1MB</li>
                </ul>
              </div>
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 items-center text-sm text-muted-foreground pt-2">
        <div className="space-y-1 text-center">
          <p>Bank will be enabled once the stake pool activates at the end of the epoch.</p>
          <p>Stake pool creation fee 1.1 SOL</p>
        </div>
        <Button
          disabled={
            !form.voteAccountKey ||
            !form.assetName ||
            !form.assetSymbol ||
            !form.assetLogo ||
            Object.values(errors).some((error) => error !== null) ||
            isLoading
          }
          type="submit"
          size="lg"
        >
          {isLoading ? (
            <>
              <IconLoader2 size={16} className="animate-spin" />
              Creating Staked Asset Bank...
            </>
          ) : (
            "Create Staked Asset Bank"
          )}
        </Button>
      </div>
    </form>
  );
};
