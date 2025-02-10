import { HeaderContext } from "@tanstack/react-table";
import { IconInfoCircle, IconSortAscending, IconSortDescending } from "@tabler/icons-react";
import Image from "next/image";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { cn } from "@mrgnlabs/mrgn-utils";
import { AssetListModel } from "../utils";

interface HeaderWrapperProps {
  header: HeaderContext<AssetListModel, any>;
  infoTooltip?: React.ReactNode;
  align?: "left" | "right";
  children: React.ReactNode;
}

export const HeaderWrapper = ({ header, infoTooltip, align = "right", children }: HeaderWrapperProps) => {
  const colSort = header.column.getCanSort() ? (
    header.column.getNextSortingOrder() === "asc" ? (
      <IconSortDescending size={18} />
    ) : header.column.getNextSortingOrder() === "desc" ? undefined : (
      <IconSortAscending size={18} />
    )
  ) : undefined;

  return (
    <div
      className={cn(
        "text-muted-foreground text-sm font-light border-none flex items-center gap-1",
        align === "left" && "justify-start",
        align === "right" && "justify-end",
        header.column.getCanSort() ? "cursor-pointer select-none" : ""
      )}
      onClick={header.column.getToggleSortingHandler()}
    >
      {infoTooltip ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                {children}
                <IconInfoCircle size={14} />
                {colSort}
              </div>
            </TooltipTrigger>
            <TooltipContent>{infoTooltip}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <>
          {children}
          {colSort}
        </>
      )}
    </div>
  );
};
