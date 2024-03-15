import React from "react";

import { Desktop, Mobile } from "~/mediaQueries";

import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Drawer, DrawerContent, DrawerTrigger } from "~/components/ui/drawer";

type TokenListWrapperProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  Trigger: React.JSX.Element;
  Content: React.JSX.Element;
  label?: string;
};

export const TokenListWrapper = ({
  isOpen,
  setIsOpen,
  Trigger,
  Content,
  label = "Select Token",
}: TokenListWrapperProps) => {
  return (
    <>
      <Desktop>
        <Popover open={isOpen} onOpenChange={(open) => setIsOpen(open)}>
          <PopoverTrigger asChild>
            <div>{Trigger}</div>
          </PopoverTrigger>
          <PopoverContent
            className="p-1 w-[320px] bg-background-gray"
            align="start"
            side="bottom"
            sideOffset={-50}
            avoidCollisions={false}
          >
            <div className="max-h-[480px] min-h-[200px] relative overflow-auto">{Content}</div>
          </PopoverContent>
        </Popover>
      </Desktop>
      <Mobile>
        <Drawer open={isOpen} onOpenChange={(open) => setIsOpen(open)}>
          <DrawerTrigger asChild>
            <div>{Trigger}</div>
          </DrawerTrigger>
          <DrawerContent className="h-full pb-5 z-[55]">
            <div className="py-8 bg-background-gray h-full">
              <h3 className="px-3 text-2xl font-semibold">{label}</h3>
              {Content}
            </div>
          </DrawerContent>
        </Drawer>
      </Mobile>
    </>
  );
};
