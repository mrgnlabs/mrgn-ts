import React from "react";
import ReactDOM from "react-dom";

import Confetti from "react-confetti";
import { useWindowSize } from "@uidotdev/usehooks";
import { IconPlus } from "@tabler/icons-react";
import { PublicKey } from "@solana/web3.js";
import { cn } from "@mrgnlabs/mrgn-utils";

import { useIsMobile } from "~/hooks/use-is-mobile";

import { Dialog, DialogContent, DialogTrigger } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import type { TokenData } from "~/types";

import { PoolData, PoolMintData, CreatePoolState } from "./types";
import {
  CreatePoolForm,
  CreatePoolSuccess,
  CreatePoolToken,
  CreatePoolLoading,
  CreatePoolQuote,
  CreatePoolConfigure,
  CreatePoolReview,
} from "./components";

type CreatePoolDialogProps = {
  trigger?: React.ReactNode;
};

export type SUPPORTED_QUOTE_BANKS = "USDC" | "LST";

export const CreatePoolDialog = ({ trigger }: CreatePoolDialogProps) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [createPoolState, setCreatePoolState] = React.useState<CreatePoolState>(CreatePoolState.TOKEN);
  const [isSearchingToken, setIsSearchingToken] = React.useState(false);
  const [isTokenFetchingError, setIsTokenFetchingError] = React.useState(false);
  const [poolData, setPoolData] = React.useState<PoolData | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { width, height } = useWindowSize();
  const isMobile = useIsMobile();

  const fetchTokenInfo = React.useCallback(
    async (mintAddress: string) => {
      setIsSearchingToken(true);

      try {
        const mint = new PublicKey(mintAddress);
        const fetchTokenReq = await fetch(`/api/token/overview?address=${mint.toBase58()}`);

        if (!fetchTokenReq.ok) {
          throw new Error("Failed to fetch token info");
        }

        const tokenInfo = (await fetchTokenReq.json()) as TokenData;
        if (!tokenInfo) {
          throw new Error("Could not find token info");
        }

        const mintData: PoolMintData = {
          mint: new PublicKey(tokenInfo.address),
          name: tokenInfo.name,
          symbol: tokenInfo.symbol,
          icon: tokenInfo.imageUrl,
          decimals: tokenInfo.decimals,
          price: tokenInfo.price,
        };

        setIsSearchingToken(false);
        if (createPoolState === CreatePoolState.QUOTE) {
          setPoolData((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              quoteToken: mintData,
            };
          });
          setCreatePoolState(CreatePoolState.FORM);
        } else {
          setPoolData({
            token: mintData,
          });
          setCreatePoolState(CreatePoolState.QUOTE);
        }
      } catch (e) {
        console.error(e);
        setPoolData(null);
        setIsTokenFetchingError(true);
        setIsSearchingToken(false);
      }
    },
    [createPoolState]
  );

  // React.useEffect(() => {
  //   if (!searchQuery.length) {
  //     resetSearchResults();
  //     return;
  //   }
  //   searchBanks(searchQuery);
  // }, [searchBanks, resetSearchResults, searchQuery]);

  const reset = React.useCallback(() => {
    setIsSearchingToken(false);
    setIsTokenFetchingError(false);
    setPoolData(null);
    setIsSubmitting(false);
  }, []);

  React.useEffect(() => {
    reset();
    setCreatePoolState(CreatePoolState.TOKEN);
  }, [isOpen, reset, setCreatePoolState]);

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
          // if (!open) resetSearchResults();
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
        <DialogContent className="w-full space-y-4 sm:max-w-4xl md:max-w-4xl z-[70] px-4" closeClassName="top-0">
          {createPoolState === CreatePoolState.TOKEN && (
            <CreatePoolToken
              isSearchingToken={isSearchingToken}
              fetchTokenInfo={fetchTokenInfo}
              setIsOpen={setIsOpen}
            />
          )}
          {createPoolState === CreatePoolState.QUOTE && poolData?.token && (
            <CreatePoolQuote
              tokenData={poolData.token}
              isSearchingToken={isSearchingToken}
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

          {createPoolState === CreatePoolState.CONFIGURE && (
            <CreatePoolConfigure
              poolData={poolData}
              setPoolData={setPoolData}
              setCreatePoolState={setCreatePoolState}
            />
          )}

          {createPoolState === CreatePoolState.REVIEW && (
            <CreatePoolReview poolData={poolData} setCreatePoolState={setCreatePoolState} />
          )}

          {createPoolState === CreatePoolState.LOADING && (
            <CreatePoolLoading poolData={poolData} setPoolData={setPoolData} setCreatePoolState={setCreatePoolState} />
          )}

          {createPoolState === CreatePoolState.SUCCESS && <CreatePoolSuccess poolData={poolData} />}
        </DialogContent>
      </Dialog>
    </>
  );
};
