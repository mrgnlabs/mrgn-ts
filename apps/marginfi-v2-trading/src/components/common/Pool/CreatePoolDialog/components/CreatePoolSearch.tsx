import React from "react";

import Image from "next/image";
import { useRouter } from "next/router";

import { IconSearch, IconPlus } from "@tabler/icons-react";
import { usdFormatter } from "@mrgnlabs/mrgn-common";

import { useTradeStore } from "~/store";
import { cn, getTokenImageURL } from "~/utils";

import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";

import { CreatePoolState } from "~/components/common/Pool/CreatePoolDialog";

type CreatePoolSearchProps = {
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setCreatePoolState: React.Dispatch<React.SetStateAction<CreatePoolState>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  debouncedSearchQuery: string;
};

export const CreatePoolSearch = ({
  setIsOpen,
  setCreatePoolState,
  searchQuery,
  setSearchQuery,
  debouncedSearchQuery,
}: CreatePoolSearchProps) => {
  const { filteredBanks, resetActiveGroup } = useTradeStore((state) => ({
    filteredBanks: state.filteredBanks,
    resetActiveGroup: state.resetActiveGroup,
  }));

  const router = useRouter();
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <>
      <div className="text-center space-y-2 max-w-lg mx-auto">
        <h2 className="text-3xl font-medium">Search existing pools</h2>
        <p className="text-lg text-muted-foreground">Search for an existing pool before creating a new one.</p>
      </div>
      <div className="space-y-8">
        <div className="relative w-full max-w-2xl mx-auto">
          <IconSearch
            size={18}
            className={cn(
              "absolute inset-y-0 left-5 h-full text-muted-foreground transition-colors md:left-6",
              searchQuery.length && "text-primary"
            )}
          />
          <div className="bg-gradient-to-r from-mrgn-gold/80 to-mrgn-chartreuse/80 rounded-full p-0.5 transition-colors">
            <Input
              ref={searchInputRef}
              placeholder="Search tokens by name, symbol, or mint address..."
              className="py-2 pr-6 pl-12 h-auto text-lg rounded-full bg-background outline-none focus-visible:ring-primary/75"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div>
          {debouncedSearchQuery.length > 1 && searchQuery.length > 1 && filteredBanks.length === 0 && (
            <div className="text-center text-muted-foreground w-full">
              <p>No results found for &quot;{searchQuery}&quot;</p>
            </div>
          )}

          {debouncedSearchQuery.length > 0 && filteredBanks.length > 0 && (
            <div className="space-y-3">
              {filteredBanks.slice(0, 5).map((bank, index) => (
                <button
                  onClick={() => {
                    resetActiveGroup();
                    router.push(`/pools/${bank.address.toBase58()}`);
                    setIsOpen(false);
                  }}
                  className="flex flex-col items-center w-full gap-4 even:bg-background-gray px-4 py-3 rounded-lg cursor-pointer hover:bg-background-gray-light/50 md:flex-row md:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <Image
                      src={getTokenImageURL(bank.meta.tokenSymbol)}
                      width={32}
                      height={32}
                      alt={bank.meta.tokenSymbol}
                      className="rounded-full"
                    />
                    <h3>
                      {bank.meta.tokenName} ({bank.meta.tokenSymbol})
                    </h3>
                  </div>
                  <div className="flex items-center gap-12 text-sm md:ml-auto md:text-right">
                    <p className="space-x-1.5">
                      <strong className="font-medium">Price:</strong>{" "}
                      <span className="font-mono text-sm text-muted-foreground">
                        {usdFormatter.format(bank.info.oraclePrice.priceRealtime.price.toNumber())}
                      </span>
                    </p>
                    <p className="space-x-1.5">
                      <strong className="font-medium">Deposits:</strong>{" "}
                      <span className="font-mono text-sm text-muted-foreground">
                        {usdFormatter.format(
                          bank.info.state.totalDeposits * bank.info.oraclePrice.priceRealtime.price.toNumber()
                        )}
                      </span>
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {searchQuery.length > 0 && filteredBanks.length === 0 && (
            <div className="flex justify-center pt-4">
              <Button onClick={() => setCreatePoolState(CreatePoolState.MINT)} variant="secondary">
                <IconPlus size={18} /> Create new pool
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
