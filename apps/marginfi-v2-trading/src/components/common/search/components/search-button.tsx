import { IconSearch } from "@tabler/icons-react";

import { Input } from "~/components/ui/input";

type SearchButtonProps = {
  onClick: () => void;
};

const SearchButton = ({ onClick }: SearchButtonProps) => {
  return (
    <button className="group relative" onClick={onClick}>
      <Input placeholder="Search pools" className="pointer-events-none group-hover:bg-muted pl-8 min-w-64" />
      <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <span className="text-muted-foreground/75 text-xs absolute right-3 top-1/2 -translate-y-1/2">⌘ K</span>
    </button>
  );
};

export { SearchButton };
