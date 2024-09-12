import { IconChevronLeft, IconArrowRight, IconLoader2 } from "@tabler/icons-react";

import { cn } from "~/utils";

import { CreatePoolState } from "~/components/common/Pool/CreatePoolDialog";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

type CreatePoolMintProps = {
  mintAddress: string;
  isSearchingToken: boolean;
  setMintAddress: React.Dispatch<React.SetStateAction<string>>;
  fetchTokenInfo: () => void;
};

export const CreatePoolMint = ({
  mintAddress,
  isSearchingToken,
  setMintAddress,
  fetchTokenInfo,
}: CreatePoolMintProps) => {
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
        onSubmit={(e) => {
          e.preventDefault();
          fetchTokenInfo();
        }}
      >
        <Input
          disabled={isSearchingToken}
          placeholder="Token mint address..."
          className="w-5/6 mx-auto py-2 px-6 h-auto text-lg rounded-full bg-background outline-none focus-visible:ring-primary/75 disabled:opacity-100"
          autoFocus
          value={mintAddress}
          onChange={(e) => setMintAddress(e.target.value)}
        />

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
