import React from "react";
import { IconArrowRight, IconFlame, IconLoader2 } from "@tabler/icons-react";
import { PublicKey } from "@solana/web3.js";

import { cn, useIsMobile } from "@mrgnlabs/mrgn-utils";
import { useTradeStoreV2 } from "~/store";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { BirdeyeTrendingToken } from "~/types/api.types";

type CreatePoolTokenProps = {
  isSearchingToken: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  fetchTokenInfo: (mintAddress: string) => void;
};

export const CreatePoolToken = ({ isSearchingToken, setIsOpen, fetchTokenInfo }: CreatePoolTokenProps) => {
  const [mintAddress, setMintAddress] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [trendingTokens, setTrendingTokens] = React.useState<BirdeyeTrendingToken[]>([]);
  const [tempAddress, setTempAddress] = React.useState("");
  const [initialized, arenaPoolsSummary] = useTradeStoreV2((state) => [state.initialized, state.arenaPoolsSummary]);
  const isMobile = useIsMobile();
  const fetchTrendingTokens = React.useCallback(async () => {
    const response = await fetch("/api/token/trending");
    const data = await response.json();

    const filteredData = data
      .filter(
        (item: BirdeyeTrendingToken) =>
          !Object.values(arenaPoolsSummary).some((arenaPoolSummaryItem) =>
            arenaPoolSummaryItem.tokenSummary.mint.equals(new PublicKey(item.address))
          )
      )
      .slice(0, isMobile ? 3 : 5);

    setTrendingTokens(filteredData);
  }, [arenaPoolsSummary, isMobile]);

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

    fetchTokenInfo(mintAddress);
  }, [mintAddress, arenaPoolsSummary, fetchTokenInfo]);

  React.useEffect(() => {
    if (!initialized || trendingTokens.length > 0) return;
    fetchTrendingTokens();
  }, [trendingTokens, fetchTrendingTokens, initialized]);

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
        onSubmit={(e) => {
          e.preventDefault();
          setMintAddress(tempAddress);
        }}
      >
        <Input
          name="mintAddress"
          disabled={isSearchingToken}
          placeholder="Token mint address..."
          className="w-5/6 mx-auto py-2 px-6 h-auto text-lg rounded-full bg-background outline-none focus-visible:ring-primary/75 disabled:opacity-100"
          autoFocus
          value={tempAddress}
          onChange={(e) => {
            setTempAddress(e.target.value);
            setError(null);
          }}
        />

        <div className="flex flex-col gap-3 md:gap-4 justify-center items-center">
          <p className="text-sm font-normal text-muted-foreground text-center">
            <IconFlame size={20} className="inline fill-orange-400 stroke-orange-400 -translate-y-[2px]" />
            Choose from trending tokens, or create something new
          </p>
          <div className="flex items-center gap-2">
            {trendingTokens.map((token) => (
              <Button
                key={token.address}
                type="button"
                variant="outline"
                size="sm"
                className="gap-1 py-1 px-2"
                onClick={(e) => {
                  setMintAddress(token.address);
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={token.logoURI} alt={`${token.symbol} icon`} width={16} height={16} className="rounded-full" />
                {token.symbol}
              </Button>
            ))}
          </div>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex flex-col gap-4">
          <Button disabled={isSearchingToken || !tempAddress.length} type="submit" variant="secondary">
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
