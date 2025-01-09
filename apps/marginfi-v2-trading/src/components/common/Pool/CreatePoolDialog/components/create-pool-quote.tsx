import React from "react";
import Link from "next/link";
import Image from "next/image";

import { IconArrowRight, IconLoader2, IconQuestionMark } from "@tabler/icons-react";
import { PublicKey } from "@solana/web3.js";

import { cn, getTokenImageURL } from "@mrgnlabs/mrgn-utils";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { useTradeStoreV2 } from "~/store";
import { ArenaPoolSummary } from "~/types/trade-store.types";
import type { PoolMintData } from "../types";

type CreatePoolMintProps = {
  tokenData: PoolMintData;
  isSearchingToken: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  fetchTokenInfo: (mintAddress: string) => void;
};

const suggestedTokens = {
  USDC: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
  USDT: new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"),
  SOL: new PublicKey("So11111111111111111111111111111111111111112"),
  LST: new PublicKey("LSTxxxnJzKDFSLr4dUkPcmCf5VyryEqzPLz5j4bpxFp"),
};

export const CreatePoolQuote = ({ tokenData, isSearchingToken, setIsOpen, fetchTokenInfo }: CreatePoolMintProps) => {
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

  React.useEffect(() => {
    if (!mintAddress.length) return;
    if (!mintAddress.length) return;

    if (!verifyPublickey(mintAddress)) {
      setError("Invalid mint address, please try again.");
      return;
    }

    if (mintAddress === tokenData.mint.toBase58()) {
      setError("Quote token cannot be the same as the base token.");
      return;
    }

    const pools = Object.values(arenaPoolsSummary).filter((summary) =>
      summary.tokenSummary.mint.equals(new PublicKey(tokenData.mint.toBase58()))
    );

    if (pools.length) {
      const quotePool = pools.find((pool) => pool.quoteSummary.mint.equals(new PublicKey(mintAddress)));

      if (quotePool) {
        setPoolExists(quotePool);
        return;
      }
    }

    fetchTokenInfo(mintAddress);
  }, [mintAddress, arenaPoolsSummary, fetchTokenInfo, tokenData]);

  return (
    <>
      <div className="text-center space-y-2 w-full mx-auto">
        <div className="flex flex-col items-center justify-center gap-1">
          <div className="flex items-center translate-x-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={tokenData.icon} alt={tokenData.symbol} className="w-10 h-10 rounded-full" />
            <div className="w-10 h-10 bg-muted opacity-80 rounded-full flex items-center justify-center -translate-x-4">
              <IconQuestionMark size={18} />
            </div>
          </div>
          <div className="text-3xl font-medium flex items-center gap-2">
            <h2 className="shrink-0">{tokenData.symbol} /</h2> <Skeleton className="w-20 h-5 translate-y-[2px]" />
          </div>
        </div>
        <p className="text-lg text-muted-foreground">
          Enter the mint address of the token you&apos;d like to to pair with {tokenData.symbol}.
        </p>
      </div>
      <form
        className={cn(
          "space-y-8 w-full flex flex-col items-center",
          isSearchingToken && "pointer-events-none animate-pulsate"
        )}
        onSubmit={(e) => {
          e.preventDefault();
          setMintAddress(mintAddress);
        }}
      >
        <Input
          name="mintAddress"
          disabled={isSearchingToken}
          placeholder="Quote token mint address..."
          className="md:w-5/6 mx-auto py-2 px-6 h-auto text-lg rounded-full bg-background outline-none focus-visible:ring-primary/75 disabled:opacity-100"
          autoFocus
          value={mintAddress}
          onChange={(e) => {
            setMintAddress(e.target.value);
            setError(null);
          }}
        />

        <div className="flex flex-col gap-2 justify-center items-center">
          <p className="text-sm text-muted-foreground text-center">
            Choose from popular quote tokens, or create something new.
          </p>
          <div className="flex items-center gap-2">
            {Object.entries(suggestedTokens).map(([key, value]) => (
              <Button
                key={key}
                type="button"
                variant="outline"
                size="sm"
                className="gap-1 py-1 px-2"
                onClick={(e) => {
                  setMintAddress(value.toBase58());
                }}
              >
                <Image
                  src={getTokenImageURL(value)}
                  alt={`${key} icon`}
                  width={16}
                  height={16}
                  className="rounded-full"
                />
                {key}
              </Button>
            ))}
          </div>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        {poolExists ? (
          <div className="flex flex-col justify-center items-center w-full max-w-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
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
