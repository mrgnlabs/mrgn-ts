import { ArenaPoolSummary } from "~/types";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "~/components/ui/command";
import Link from "next/link";

type SearchDialogProps = {
  open: boolean;
  pools: ArenaPoolSummary[];
  setOpen: (open: boolean) => void;
};

const SearchDialog = ({ open, setOpen, pools }: SearchDialogProps) => {
  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      commandProps={{
        filter: (value, search) => Number(value.toLowerCase().includes(search.toLowerCase())),
      }}
    >
      <CommandInput placeholder="Search pools..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup className="max-h-[300px] overflow-y-auto">
          {pools.map((pool) => (
            <CommandItem key={pool.groupPk.toBase58()}>
              <Link
                href={`/trade/${pool.groupPk.toBase58()}`}
                className="flex items-center gap-2 justify-between cursor-pointer"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pool.tokenSummary.tokenLogoUri}
                  width={32}
                  height={32}
                  alt={pool.tokenSummary.tokenName}
                  className="rounded-full border h-[32px] w-[32px] object-cover"
                />
                <span>
                  {pool.tokenSummary.tokenSymbol} / {pool.quoteSummary.tokenSymbol}
                </span>
              </Link>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

export { SearchDialog };
