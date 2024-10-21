import React from "react";
import { IconChevronLeft } from "@tabler/icons-react";

import { CreatePoolState } from "~/components/common/Pool/CreatePoolDialog";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Loader } from "~/components/ui/loader";
import { Label } from "~/components/ui/label";

import type { PoolData } from "../types";

type CreatePoolFormProps = {
  isTokenFetchingError: boolean;
  poolData: PoolData | null;
  setCreatePoolState: React.Dispatch<React.SetStateAction<CreatePoolState>>;
  reset: () => void;
};

export const CreatePoolForm = ({ isTokenFetchingError, poolData, setCreatePoolState, reset }: CreatePoolFormProps) => {
  if (!poolData) return null;
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1 absolute top-2 left-1.5 text-muted-foreground"
        onClick={() => {
          setCreatePoolState(CreatePoolState.MINT);
          reset();
        }}
      >
        <IconChevronLeft size={18} /> Back
      </Button>
      <div className="text-center space-y-2 max-w-md mx-auto">
        <h2 className="text-3xl font-medium">{isTokenFetchingError ? "Token details" : "Confirm token details"}</h2>
        <p className="text-muted-foreground">
          {isTokenFetchingError
            ? "Please provide details about the token."
            : "Please review and confirm the token details."}
        </p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="relative h-full flex flex-col gap-2 items-center justify-center bg-secondary/20 border border-input/50 rounded-lg py-8 px-12 text-muted-foreground hover:bg-secondary/20">
            {poolData.icon && (
              // using img as source unknown and not whitelisted in next config
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={poolData.icon}
                alt="Preview"
                className="max-w-full max-h-48 rounded-full relative z-20"
                height={192}
                width={192}
              />
            )}

            <div className="absolute w-[192px] h-[192px] flex items-center justify-center top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-secondary rounded-full text-muted-foreground opacity-40 z-10">
              <Loader label="Loading image..." className="text-xs" iconSize={24} />
            </div>
          </div>
          <div className="space-y-4 text-xs">
            <div className="space-y-1">
              <Label className="font-medium text-xs">Mint address</Label>
              <Input value={poolData.mint.toBase58()} disabled={true} />
            </div>
            <div className="space-y-1">
              <Label className="font-medium text-xs">Token name</Label>
              <Input value={poolData.name} disabled={true} />
            </div>
            <div className="space-y-1">
              <Label className="font-medium text-xs">Token symbol</Label>
              <Input value={poolData.symbol} disabled={true} />
            </div>
            <div className="space-y-1">
              <Label className="font-medium text-xs">Token decimals</Label>
              <Input type="number" value={poolData.decimals} disabled={true} />
            </div>
            <Button
              className="w-full"
              type="button"
              onClick={() => {
                setCreatePoolState(CreatePoolState.LOADING);
              }}
            >
              Create Pool
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};
