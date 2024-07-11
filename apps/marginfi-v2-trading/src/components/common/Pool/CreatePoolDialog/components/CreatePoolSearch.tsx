import React from "react";

import { IconPlus } from "@tabler/icons-react";

import { useTradeStore } from "~/store";

import { PoolSearch } from "~/components/common/Pool";
import { CreatePoolState } from "~/components/common/Pool/CreatePoolDialog";

import { Button } from "~/components/ui/button";

type CreatePoolSearchProps = {
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setCreatePoolState: React.Dispatch<React.SetStateAction<CreatePoolState>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  debouncedSearchQuery: string;
};

export const CreatePoolSearch = ({ setIsOpen, setCreatePoolState }: CreatePoolSearchProps) => {
  const [resetSearchResults] = useTradeStore((state) => [state.resetSearchResults]);
  return (
    <>
      <div className="text-center space-y-2 max-w-lg mx-auto">
        <h2 className="text-3xl font-medium">Search existing pools</h2>
        <p className="text-lg text-muted-foreground">Search for an existing pool before creating a new one.</p>
      </div>
      <div className="md:w-5/6 md:mx-auto">
        <PoolSearch
          size="sm"
          onBankSelect={() => {
            resetSearchResults();
            setIsOpen(false);
          }}
          additionalContent={
            <Button onClick={() => setCreatePoolState(CreatePoolState.MINT)} variant="secondary">
              <IconPlus size={18} /> Create new pool
            </Button>
          }
        />
      </div>
    </>
  );
};
