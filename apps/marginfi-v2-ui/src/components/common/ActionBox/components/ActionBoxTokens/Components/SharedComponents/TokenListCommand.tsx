import React from "react";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { Command, CommandInput, CommandList } from "~/components/ui/command";
import { IconX } from "~/components/ui/icons";
import { useIsMobile } from "~/hooks/useIsMobile";
import { cn } from "~/utils";

type TokenListCommandProps = {
  selectedBank?: ExtendedBankInfo;
  onSetSearchQuery: (search: string) => void;
  onClose: () => void;
  children: React.ReactNode;
};

export const TokenListCommand = ({ selectedBank, onSetSearchQuery, onClose, children }: TokenListCommandProps) => {
  const isMobile = useIsMobile();
  return (
    <>
      <Command
        className="bg-background-gray relative"
        shouldFilter={false}
        value={selectedBank?.address?.toString().toLowerCase() ?? ""}
      >
        <CommandInput
          placeholder="Search token..."
          wrapperClassName="fixed bg-background-gray w-[94%] z-40 flex justify-between"
          className="h-12"
          autoFocus={false}
          onValueChange={(value) => onSetSearchQuery(value)}
        />
        <button onClick={() => onClose()} className={cn("fixed z-50", isMobile ? "top-14 right-4" : "top-5 right-4")}>
          <IconX size={18} className="text-white/50" />
        </button>
        <CommandList className="overflow-auto mt-[50px]">{children}</CommandList>
      </Command>
    </>
  );
};
