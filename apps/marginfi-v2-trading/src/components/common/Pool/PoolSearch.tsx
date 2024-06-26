import React from "react";

import { IconSearch } from "@tabler/icons-react";
import { useDebounce } from "@uidotdev/usehooks";

import { useTradeStore } from "~/store";
import { cn } from "~/utils";

import { Input } from "~/components/ui/input";

export const PoolSearch = () => {
  const [searchBanks] = useTradeStore((state) => [state.searchBanks]);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  React.useEffect(() => {
    searchBanks(debouncedSearchQuery);
  }, [debouncedSearchQuery]);

  return (
    <div className="relative w-full">
      <IconSearch
        size={20}
        className={cn(
          "absolute inset-y-0 left-5 h-full text-muted-foreground transition-colors md:left-6",
          searchQuery.length && "text-primary"
        )}
      />
      <div className="bg-gradient-to-r from-mrgn-gold/80 to-mrgn-chartreuse/80 rounded-full p-0.5 transition-colors">
        <Input
          ref={searchInputRef}
          placeholder="Search tokens by name, symbol, or mint address..."
          className="py-2 pr-3 pl-12 h-auto text-lg rounded-full bg-background outline-none focus-visible:ring-primary/75 md:text-xl md:py-3 md:pl-14"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
    </div>
  );
};
