import React from "react";

import { useRouter } from "next/router";
import { Desktop, Mobile } from "@mrgnlabs/mrgn-utils";

import { useDebounce } from "@uidotdev/usehooks";

import { useTradeStore } from "~/store";
import { useIsMobile } from "~/hooks/useIsMobile";

import { PoolSearchDefault, PoolSearchDialog } from "./components/";

type PoolSearchProps = {
  size?: "sm" | "lg";
  maxResults?: number;
  additionalContent?: React.ReactNode;
  additionalContentQueryMin?: number;
  onBankSelect?: () => void;
  showNoResults?: boolean;
};

export const PoolSearch = ({
  size = "lg",
  maxResults = 5,
  additionalContent,
  additionalContentQueryMin = 3,
  onBankSelect,
  showNoResults = true,
}: PoolSearchProps) => {
  const router = useRouter();
  const [groupMap, searchBanks, searchResults, resetSearchResults] = useTradeStore((state) => [
    state.groupMap,
    state.searchBanks,
    state.searchResults,
    state.resetSearchResults,
  ]);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [isFocused, setIsFocused] = React.useState(false);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const isMobile = useIsMobile();

  const groups = [...groupMap.values()];

  React.useEffect(() => {
    if (!debouncedSearchQuery.length) {
      resetSearchResults();
      return;
    }
    searchBanks(debouncedSearchQuery);
  }, [debouncedSearchQuery, searchBanks, resetSearchResults]);

  const resetSearch = React.useCallback(() => {
    resetSearchResults();
    setSearchQuery("");
  }, [resetSearchResults]);

  return (
    <>
      <Desktop>
        <PoolSearchDefault
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          resetSearch={resetSearch}
          searchResults={searchResults}
          size={size}
          additionalContent={additionalContent}
          additionalContentQueryMin={additionalContentQueryMin}
          showNoResults={showNoResults}
          onBankSelect={(value) => {
            const foundGroup = groups.find((g) => g.groupPk.toBase58().toLowerCase() === value);
            if (!foundGroup) return;

            router.push(`/trade/${foundGroup.groupPk.toBase58()}`);
            if (onBankSelect) onBankSelect();
          }}
          maxResults={maxResults}
        />
      </Desktop>
      <Mobile>
        <PoolSearchDialog
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          resetSearch={resetSearch}
          searchResults={searchResults}
          additionalContent={additionalContent}
          additionalContentQueryMin={additionalContentQueryMin}
          showNoResults={showNoResults}
          onBankSelect={(value) => {
            const foundGroup = groups.find((g) => g.groupPk.toBase58().toLowerCase() === value);
            if (!foundGroup) return;

            router.push(`/trade/${foundGroup.groupPk.toBase58()}`);
            if (onBankSelect) onBankSelect();
          }}
          maxResults={maxResults}
        />
      </Mobile>
    </>
  );
};
