import React from "react";

import { IconSearch } from "@tabler/icons-react";
import { useDebounce } from "@uidotdev/usehooks";

import { useTradeStore } from "~/store";
import { cn } from "~/utils";
import { useIsMobile } from "~/hooks/useIsMobile";

import { Input } from "~/components/ui/input";

export const PoolSearch = () => {
  const [searchBanks, resetFilteredBanks] = useTradeStore((state) => [state.searchBanks, state.resetFilteredBanks]);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const isMobile = useIsMobile();

  React.useEffect(() => {
    if (!debouncedSearchQuery.length) {
      resetFilteredBanks();
      return;
    }
    searchBanks(debouncedSearchQuery);
  }, [debouncedSearchQuery, searchBanks, resetFilteredBanks]);

  return (
    <div className="relative w-full">
      <IconSearch
        size={20}
        className={cn(
          "absolute inset-y-0 left-5 h-full text-muted-foreground transition-colors md:left-6",
          searchQuery.length && "text-primary"
        )}
      />
      <Input
        ref={searchInputRef}
        placeholder={isMobile ? "Search tokens..." : "Search tokens by name, symbol, or mint address..."}
        className="py-1.5 pr-3 pl-12 h-auto text-lg rounded-full bg-transparent outline-none border-[#4E5156] focus-visible:ring-0 md:text-xl md:py-3 md:pl-14"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>
  );
};
