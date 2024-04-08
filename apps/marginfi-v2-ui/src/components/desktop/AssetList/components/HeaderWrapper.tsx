import { HeaderContext } from "@tanstack/react-table";
import { IconSortAscending, IconSortDescending } from "@tabler/icons-react";
import Image from "next/image";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { cn } from "~/utils";
import { AssetListModel } from "../utils";

interface HeaderWrapperProps {
  header: HeaderContext<AssetListModel, any>;
  infoTooltip?: React.ReactNode;
  align?: "left" | "right";
  children: React.ReactNode;
}

export const HeaderWrapper = ({ header, infoTooltip, align = "right", children }: HeaderWrapperProps) => {
  return (
    <div
      className={cn(
        "text-[#A1A1A1] text-base font-light border-none flex items-center gap-2",
        align === "left" && "justify-start",
        align === "right" && "justify-end",
        header.column.getCanSort() ? "cursor-pointer select-none" : ""
      )}
      onClick={header.column.getToggleSortingHandler()}
    >
      {children}

      {header.column.getCanSort() ? (
        header.column.getNextSortingOrder() === "asc" ? (
          <IconSortAscending size={18} />
        ) : header.column.getNextSortingOrder() === "desc" ? undefined : (
          <IconSortDescending size={18} />
        )
      ) : undefined}

      <div>
        {infoTooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Image src="/info_icon.png" alt="info" height={16} width={16} />
              </TooltipTrigger>
              <TooltipContent>{infoTooltip}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}{" "}
      </div>
    </div>
  );
};
