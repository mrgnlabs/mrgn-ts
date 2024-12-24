import React from "react";
import Link from "next/link";
import { IconArrowRight, IconLoader2 } from "@tabler/icons-react";
import { PublicKey } from "@solana/web3.js";

import { cn, getTokenImageURL } from "@mrgnlabs/mrgn-utils";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useTradeStoreV2 } from "~/store";
import { ArenaPoolSummary } from "~/types/trade-store.types";

type CreatePoolMintProps = {
  tokenMintAddress: string;
  isSearchingToken: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  fetchTokenInfo: (mintAddress: string) => void;
};

export const CreatePoolQuote = ({
  tokenMintAddress,
  isSearchingToken,
  setIsOpen,
  fetchTokenInfo,
}: CreatePoolMintProps) => {
  const [arenaPoolsSummary] = useTradeStoreV2((state) => [state.arenaPoolsSummary]);

  const [mintAddress, setMintAddress] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [poolExists, setPoolExists] = React.useState<ArenaPoolSummary | null>(null);

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

      if (mintAddress === tokenMintAddress) {
        setError("Quote token cannot be the same as the base token.");
        return;
      }

      const pools = Object.values(arenaPoolsSummary).filter((summary) =>
        summary.tokenSummary.mint.equals(new PublicKey(tokenMintAddress))
      );

      if (pools.length) {
        const quotePool = pools.find((pool) => pool.quoteSummary.mint.equals(new PublicKey(mintAddress)));

        if (quotePool) {
          setPoolExists(quotePool);
          return;
        }
      }

      fetchTokenInfo(mintAddress);
    },
    [mintAddress, arenaPoolsSummary, fetchTokenInfo, tokenMintAddress]
  );

  return (
    <>
      <div className="text-center space-y-2 w-full mx-auto">
        <h2 className="text-3xl font-medium">Create a Token Pair</h2>
        <p className="text-lg text-muted-foreground">
          Enter the mint address of the token you&apos;d like to to pair with the base token.
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

        {poolExists ? (
          <div className="flex flex-col justify-center items-center w-full max-w-sm">
            <img
              src={getTokenImageURL(new PublicKey(poolExists.tokenSummary.mint))}
              className="rounded-full"
              width={48}
              height={48}
              alt={`${poolExists.tokenSummary.tokenSymbol} icon`}
            />
            <h3 className="mt-2">
              A pool already exists for <strong className="font-medium">{poolExists.tokenSummary.tokenSymbol}</strong>
            </h3>
            <div className="flex gap-2 mt-4">
              <Link href={`/trade/${poolExists.groupPk.toBase58()}?side=long`} className="w-full">
                <Button variant="long" onClick={() => setIsOpen(false)}>
                  Long {poolExists.tokenSummary.tokenSymbol}
                </Button>
              </Link>
              <Link href={`/trade/${poolExists.groupPk.toBase58()}?side=short`} className="w-full">
                <Button variant="short" onClick={() => setIsOpen(false)}>
                  Short {poolExists.tokenSummary.tokenSymbol}
                </Button>
              </Link>
            </div>
            <Button variant="link" className="text-muted-foreground mt-2" onClick={() => fetchTokenInfo(mintAddress)}>
              Create new pool
            </Button>
          </div>
        ) : (
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
        )}
      </form>
    </>
  );
};
