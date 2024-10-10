import React from "react";
import ReactDOM from "react-dom";

import Confetti from "react-confetti";
import { useWindowSize } from "@uidotdev/usehooks";
import { IconPlus } from "@tabler/icons-react";
import { PublicKey } from "@solana/web3.js";
import { cn } from "@mrgnlabs/mrgn-utils";

import { useTradeStore } from "~/store";
import { useIsMobile } from "~/hooks/use-is-mobile";

import {
  CreatePoolMint,
  CreatePoolForm,
  CreatePoolSuccess,
  CreatePoolState,
} from "~/components/common/Pool/CreatePoolDialog/";
import { Dialog, DialogContent, DialogTrigger } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import type { TokenData } from "~/types";

import type { PoolData } from "./types";
import { CreatePoolLoading } from "./components/CreatePoolLoading";

type CreatePoolDialogProps = {
  trigger?: React.ReactNode;
};

export const CreatePoolDialog = ({ trigger }: CreatePoolDialogProps) => {
  const [resetSearchResults, searchBanks] = useTradeStore((state) => [state.resetSearchResults, state.searchBanks]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [createPoolState, setCreatePoolState] = React.useState<CreatePoolState>(CreatePoolState.MINT);
  const [isSearchingToken, setIsSearchingToken] = React.useState(false);
  const [isTokenFetchingError, setIsTokenFetchingError] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [mintAddress, setMintAddress] = React.useState("");
  const [poolData, setPoolData] = React.useState<PoolData | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { width, height } = useWindowSize();
  const isMobile = useIsMobile();

  const fetchTokenInfo = React.useCallback(async () => {
    setIsSearchingToken(true);

    try {
      const mint = new PublicKey(mintAddress);
      const fetchTokenReq = await fetch(`/api/birdeye/token?address=${mint.toBase58()}`);

      if (!fetchTokenReq.ok) {
        throw new Error("Failed to fetch token info");
      }

      const tokenInfo = (await fetchTokenReq.json()) as TokenData;
      if (!tokenInfo) {
        throw new Error("Could not find token info");
      }

      setPoolData({
        mint: new PublicKey(tokenInfo.address),
        name: tokenInfo.name,
        symbol: tokenInfo.symbol,
        icon: tokenInfo.imageUrl,
        decimals: tokenInfo.decimals,
      });

      setIsSearchingToken(false);
      setCreatePoolState(CreatePoolState.FORM);
    } catch (e) {
      console.error(e);
      setPoolData(null);
      setIsTokenFetchingError(true);
      setIsSearchingToken(false);
    }
  }, [mintAddress]);

  React.useEffect(() => {
    if (!searchQuery.length) {
      resetSearchResults();
      return;
    }
    searchBanks(searchQuery);
  }, [searchBanks, resetSearchResults, searchQuery]);

  const reset = React.useCallback(() => {
    setIsSearchingToken(false);
    setIsTokenFetchingError(false);
    setPoolData(null);
    setIsSubmitting(false);
  }, []);

  React.useEffect(() => {
    reset();
    setSearchQuery("");
    setMintAddress("");
    setCreatePoolState(CreatePoolState.MINT);
  }, [isOpen, reset, setSearchQuery, setMintAddress, setCreatePoolState]);

  return (
    <>
      {createPoolState === CreatePoolState.SUCCESS &&
        ReactDOM.createPortal(
          <Confetti
            width={width!}
            height={height! * 2}
            recycle={false}
            opacity={0.4}
            className={cn(isMobile ? "z-[80]" : "z-[60]")}
          />,
          document.body
        )}
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) resetSearchResults();
          setIsOpen(open);
        }}
      >
        <DialogTrigger asChild>
          {trigger ? (
            trigger
          ) : (
            <Button>
              <IconPlus size={18} /> Create Pool
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="w-full space-y-4 sm:max-w-4xl md:max-w-4xl z-[70]">
          {createPoolState === CreatePoolState.MINT && (
            <CreatePoolMint
              mintAddress={mintAddress}
              isSearchingToken={isSearchingToken}
              setMintAddress={setMintAddress}
              fetchTokenInfo={fetchTokenInfo}
              setIsOpen={setIsOpen}
            />
          )}
          {createPoolState === CreatePoolState.FORM && (
            <CreatePoolForm
              isTokenFetchingError={isTokenFetchingError}
              poolData={poolData}
              setCreatePoolState={setCreatePoolState}
              reset={reset}
            />
          )}

          {createPoolState === CreatePoolState.LOADING && (
            <CreatePoolLoading poolData={poolData} setPoolData={setPoolData} setCreatePoolState={setCreatePoolState} />
          )}

          {createPoolState === CreatePoolState.SUCCESS && (
            <CreatePoolSuccess poolData={poolData} setIsOpen={setIsOpen} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
