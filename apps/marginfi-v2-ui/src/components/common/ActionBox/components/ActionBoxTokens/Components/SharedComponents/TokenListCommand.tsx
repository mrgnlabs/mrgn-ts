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
          wrapperClassName="fixed mx-2 lg:mx-0 bg-background-gray w-[calc(100%-30px)] px-4 lg:pl-3 border rounded-lg border-background-gray-light z-40 flex justify-between"
          className="h-12"
          autoFocus={false}
          onValueChange={(value) => onSetSearchQuery(value)}
        />
        <button onClick={() => onClose()} className={cn("fixed z-50", isMobile ? "top-9 right-4" : "top-8 right-6")}>
          <IconX size={18} className="text-white/50" />
        </button>
        <CommandList className="overflow-auto mt-[60px]">{children}</CommandList>
      </Command>
    </>
  );
};
