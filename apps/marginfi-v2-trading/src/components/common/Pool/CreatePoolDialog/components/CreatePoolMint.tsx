import { IconChevronLeft, IconArrowRight, IconLoader2 } from "@tabler/icons-react";

import { cn } from "~/utils";

import { CreatePoolState } from "~/components/common/Pool/CreatePoolDialog";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

type CreatePoolMintProps = {
  mintAddress: string;
  isSearchingDasApi: boolean;
  isTokenFetchingError: boolean;

  setMintAddress: React.Dispatch<React.SetStateAction<string>>;
  setIsTokenFetchingError: React.Dispatch<React.SetStateAction<boolean>>;
  setCreatePoolState: React.Dispatch<React.SetStateAction<CreatePoolState>>;

  fetchTokenInfo: () => void;
  reset: () => void;
};

export const CreatePoolMint = ({
  mintAddress,
  isSearchingDasApi,
  isTokenFetchingError,
  setMintAddress,
  setIsTokenFetchingError,
  setCreatePoolState,
  reset,
  fetchTokenInfo,
}: CreatePoolMintProps) => {
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1 absolute top-2 left-1.5 text-muted-foreground"
        onClick={() => {
          setCreatePoolState(CreatePoolState.SEARCH);
          reset();
        }}
      >
        <IconChevronLeft size={18} /> Back
      </Button>
      <div className="text-center space-y-2 max-w-lg mx-auto">
        <h2 className="text-3xl font-medium">Token mint address</h2>
        <p className="text-lg text-muted-foreground">
          Enter the mint address of the token you&apos;d like to create a pool for.
        </p>
      </div>
      <form
        className={cn(
          "space-y-8 w-full flex flex-col items-center",
          isSearchingDasApi && "pointer-events-none animate-pulsate"
        )}
        onSubmit={(e) => {
          e.preventDefault();
          fetchTokenInfo();
        }}
      >
        <Input
          disabled={isSearchingDasApi}
          placeholder="Token mint address..."
          className="w-5/6 mx-auto py-2 px-6 h-auto text-lg rounded-full bg-background outline-none focus-visible:ring-primary/75 disabled:opacity-100"
          autoFocus
          value={mintAddress}
          onChange={(e) => setMintAddress(e.target.value)}
        />

        {isTokenFetchingError ? (
          <div className="flex flex-col justify-center items-center gap-4 text-sm text-muted-foreground">
            <p>Could not find token details, please enter manually.</p>
            <Button variant="secondary" onClick={() => setCreatePoolState(CreatePoolState.FORM)}>
              Continue
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Button disabled={isSearchingDasApi || !mintAddress.length} type="submit" variant="secondary">
              {!isSearchingDasApi && (
                <>
                  Fetch token info <IconArrowRight size={18} />
                </>
              )}
              {isSearchingDasApi && (
                <>
                  <IconLoader2 size={18} className="animate-spin" /> Fetching token info...
                </>
              )}
            </Button>
            <Button
              variant="link"
              className="font-normal text-xs text-muted-foreground underline opacity-75 transition-opacity hover:opacity-100"
              onClick={() => {
                setCreatePoolState(CreatePoolState.FORM);
                setIsTokenFetchingError(true);
              }}
            >
              Skip and add details manually
            </Button>
          </div>
        )}
      </form>
    </>
  );
};
