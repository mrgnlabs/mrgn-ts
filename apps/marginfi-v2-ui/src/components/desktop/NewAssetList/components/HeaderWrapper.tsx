import Image from "next/image";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";

interface HeaderWrapperProps {
  infoTooltip?: React.ReactNode;
  children: React.ReactNode;
}

export const HeaderWrapper = ({ infoTooltip, children }: HeaderWrapperProps) => {
  return (
    <div className="text-[#A1A1A1] text-base border-none px-2 table-cell text-left">
      {children}
      {infoTooltip && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Image src="/info_icon.png" alt="info" height={16} width={16} />
            </TooltipTrigger>
            <TooltipContent>{infoTooltip}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};
