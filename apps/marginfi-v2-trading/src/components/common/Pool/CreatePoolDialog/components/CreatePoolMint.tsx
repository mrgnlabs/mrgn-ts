import React from "react";

import Image from "next/image";
import Link from "next/link";

import { IconArrowRight, IconLoader2 } from "@tabler/icons-react";
import { PublicKey } from "@solana/web3.js";

import { useTradeStore } from "~/store";
import { GroupData } from "~/store/tradeStore";
import { cn, getTokenImageURL } from "~/utils";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

type CreatePoolMintProps = {
  mintAddress: string;
  isSearchingToken: boolean;
  setMintAddress: React.Dispatch<React.SetStateAction<string>>;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  fetchTokenInfo: () => void;
};

export const CreatePoolMint = ({
  mintAddress,
  isSearchingToken,
  setMintAddress,
  setIsOpen,
  fetchTokenInfo,
}: CreatePoolMintProps) => {
  const [groupMap] = useTradeStore((state) => [state.groupMap]);
  const [error, setError] = React.useState<string | null>(null);
  const [poolExists, setPoolExists] = React.useState<GroupData | null>(null);

  const verifyPublickey = (key: string, allowPDA: boolean = false) => {
    try {
      const _ = new PublicKey(key).toBytes();
    } catch (error) {
      return false;
    }

    if (!allowPDA && !PublicKey.isOnCurve(new PublicKey(key).toBytes())) {
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

      const groups = [...groupMap.values()];

      // check if mint address is in groupMap it will be found at entry.pool.token.mint
      const group = groups.find((group: GroupData) => {
        return group.pool.token.info.rawBank.mint.equals(new PublicKey(mintAddress));
      });

      if (group) {
        setPoolExists(group);
        return;
      }

      fetchTokenInfo();
    },
    [mintAddress, groupMap, fetchTokenInfo]
  );

  return (
    <>
      <div className="text-center space-y-2 w-full mx-auto">
        <h2 className="text-3xl font-medium">Token mint address</h2>
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

        {poolExists ? (
          <div className="flex flex-col justify-center items-center w-full max-w-sm">
            <Image
              src={getTokenImageURL(poolExists.pool.token.info.rawBank.mint.toBase58())}
              className="rounded-full"
              width={48}
              height={48}
              alt={`${poolExists.pool.token.meta.tokenSymbol} icon`}
            />
            <h3 className="mt-2">
              A pool already exists for{" "}
              <strong className="font-medium">{poolExists.pool.token.meta.tokenSymbol}</strong>
            </h3>
            <div className="flex gap-2 mt-4">
              <Link href={`/trade/${poolExists.client.group.address.toBase58()}?side=long`} className="w-full">
                <Button variant="long" onClick={() => setIsOpen(false)}>
                  Long {poolExists.pool.token.meta.tokenSymbol}
                </Button>
              </Link>
              <Link href={`/trade/${poolExists.client.group.address.toBase58()}?side=short`} className="w-full">
                <Button variant="short" onClick={() => setIsOpen(false)}>
                  Short {poolExists.pool.token.meta.tokenSymbol}
                </Button>
              </Link>
            </div>
            <Button variant="link" className="text-muted-foreground mt-2" onClick={() => fetchTokenInfo()}>
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
