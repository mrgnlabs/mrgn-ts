import React from "react";
import { IconArrowRight, IconLoader2 } from "@tabler/icons-react";
import { PublicKey } from "@solana/web3.js";

import { cn, getBearerToken } from "@mrgnlabs/mrgn-utils";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

type CreatePoolTokenProps = {
  isSearchingToken: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  fetchTokenInfo: (mintAddress: string) => void;
};

export const CreatePoolToken = ({ isSearchingToken, setIsOpen, fetchTokenInfo }: CreatePoolTokenProps) => {
  const [mintAddress, setMintAddress] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const verifyPublickey = (key: string, allowPDA: boolean = false) => {
    try {
      const _ = new PublicKey(key).toBytes();
    } catch (error) {
      return false;
    }

    return true;
  };

  const onSubmit = React.useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!mintAddress.length) return;

      if (!verifyPublickey(mintAddress)) {
        setError("Invalid mint address, please try again.");
        return;
      }

      fetchTokenInfo(mintAddress);
    },
    [mintAddress, fetchTokenInfo]
  );

  return (
    <>
      <div className="text-center space-y-2 w-full mx-auto">
        <h2 className="text-3xl font-medium">Create a new Arena Pool</h2>
        <p className="text-lg text-muted-foreground">
          Enter the mint address of the token you&apos;d like to create a pool for.
        </p>
      </div>
      <form
        className={cn(
          "space-y-8 w-full flex flex-col items-center",
          isSearchingToken && "pointer-events-none animate-pulsate"
        )}
        onSubmit={onSubmit}
      >
        <Input
          name="mintAddress"
          disabled={isSearchingToken}
          placeholder="Token mint address..."
          className="w-5/6 mx-auto py-2 px-6 h-auto text-lg rounded-full bg-background outline-none focus-visible:ring-primary/75 disabled:opacity-100"
          autoFocus
          value={mintAddress}
          onChange={(e) => {
            setMintAddress(e.target.value);
            setError(null);
          }}
        />

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex flex-col gap-4">
          <Button disabled={isSearchingToken || !mintAddress.length} type="submit" variant="secondary">
            {!isSearchingToken && (
              <>
                Fetch token info <IconArrowRight size={18} />
              </>
            )}
            {isSearchingToken && (
              <>
                <IconLoader2 size={18} className="animate-spin" /> Fetching token info...
              </>
            )}
          </Button>
        </div>
      </form>
    </>
  );
};
