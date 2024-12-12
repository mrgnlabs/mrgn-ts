import React from "react";
import { IconChevronLeft } from "@tabler/icons-react";

import { CreatePoolState, SUPPORTED_QUOTE_BANKS } from "~/components/common/Pool/CreatePoolDialog";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Loader } from "~/components/ui/loader";
import { Label } from "~/components/ui/label";

import type { PoolData } from "../types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";

type CreatePoolFormProps = {
  isTokenFetchingError: boolean;
  poolData: PoolData | null;
  setCreatePoolState: React.Dispatch<React.SetStateAction<CreatePoolState>>;
  quoteBank: SUPPORTED_QUOTE_BANKS;
  setQuoteBank: React.Dispatch<React.SetStateAction<SUPPORTED_QUOTE_BANKS>>;
  reset: () => void;
};

export const CreatePoolForm = ({
  isTokenFetchingError,
  poolData,
  setCreatePoolState,
  quoteBank,
  setQuoteBank,
  reset,
}: CreatePoolFormProps) => {
  if (!poolData) return null;

  if (!poolData.quoteToken) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1 absolute top-2 left-1.5 text-muted-foreground"
        onClick={() => {
          setCreatePoolState(CreatePoolState.TOKEN);
          reset();
        }}
      >
        <IconChevronLeft size={18} /> Back
      </Button>
      <div className="text-center space-y-2 max-w-lg mx-auto">
        <h2 className="text-3xl font-medium">
          Confirm token details for {`${poolData.token.symbol}/${poolData.quoteToken.symbol}`}
        </h2>
        <p className="text-muted-foreground">
          {isTokenFetchingError
            ? "Please provide details about the token."
            : "Please review and confirm the token details."}
        </p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4 text-xs">
            <h4 className="text-sm font-medium">Token details</h4>
            <div className="space-y-1">
              <Label className="font-medium text-xs">Mint address</Label>
              <Input value={poolData.token.mint.toBase58()} disabled={true} />
            </div>
            <div className="space-y-1">
              <Label className="font-medium text-xs">Token name</Label>
              <Input value={poolData.token.name} disabled={true} />
            </div>
            <div className="flex w-full gap-2">
              <div className="space-y-1 flex-1">
                <Label className="font-medium text-xs">Token symbol</Label>
                <Input value={poolData.token.symbol} disabled={true} />
              </div>
              <div className="space-y-1 flex-1">
                <Label className="font-medium text-xs">Token decimals</Label>
                <Input type="number" value={poolData.token.decimals} disabled={true} />
              </div>
            </div>
          </div>
          <div className="space-y-4 text-xs">
            <h4 className="text-sm font-medium">Quote token details</h4>
            <div className="space-y-1">
              <Label className="font-medium text-xs">Mint address</Label>
              <Input value={poolData.quoteToken.mint.toBase58()} disabled={true} />
            </div>
            <div className="space-y-1">
              <Label className="font-medium text-xs">Token name</Label>
              <Input value={poolData.quoteToken.name} disabled={true} />
            </div>
            <div className="flex w-full gap-2">
              <div className="space-y-1 flex-1">
                <Label className="font-medium text-xs">Token symbol</Label>
                <Input value={poolData.quoteToken.symbol} disabled={true} />
              </div>
              <div className="space-y-1 flex-1">
                <Label className="font-medium text-xs">Token decimals</Label>
                <Input type="number" value={poolData.quoteToken.decimals} disabled={true} />
              </div>
            </div>
          </div>
        </div>
        <Button
          className="flex justify-center items-center px-20 mx-auto"
          type="button"
          onClick={() => {
            setCreatePoolState(CreatePoolState.LOADING);
          }}
        >
          Create Pool
        </Button>
      </div>
    </>
  );
};
