import React from "react";
import { IconX } from "@tabler/icons-react";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { Command, CommandInput, CommandList } from "~/components/ui/command";
import { cn, useIsMobile } from "@mrgnlabs/mrgn-utils";

type BankListCommandProps = {
  selectedBank: ExtendedBankInfo | null;
  onSetSearchQuery: (search: string) => void;
  onClose: () => void;
  children: React.ReactNode;
};

export const BankListCommand = ({ selectedBank, onSetSearchQuery, onClose, children }: BankListCommandProps) => {
  const isMobile = useIsMobile();

  return (
    <Command
      className="bg-mfi-action-box-background relative"
      shouldFilter={false}
      value={selectedBank?.address?.toString().toLowerCase() ?? ""}
    >
      <CommandInput
        placeholder="Search token..."
        wrapperClassName="fixed mx-2 lg:mx-0 bg-mfi-action-box-background w-[calc(100%-50px)] md:w-[calc(100%-30px)] px-4 lg:pl-3 border rounded-lg border-border z-40 flex justify-between "
        className="h-12"
        autoFocus={true}
        onValueChange={(value) => onSetSearchQuery(value)}
      />
      <button onClick={() => onClose()} className={cn("fixed z-50 top-8 ", isMobile ? "right-10" : "right-6")}>
        <IconX size={18} className="opacity-50" />
      </button>
      <CommandList className="overflow-auto my-[60px]">{children}</CommandList>
    </Command>
  );
};
