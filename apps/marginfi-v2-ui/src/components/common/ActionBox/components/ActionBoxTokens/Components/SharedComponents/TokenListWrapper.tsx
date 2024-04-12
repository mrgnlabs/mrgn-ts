import React from "react";

import { Desktop, Mobile } from "~/mediaQueries";

import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Drawer, DrawerContent, DrawerTrigger } from "~/components/ui/drawer";
import { Dialog, DialogContent, DialogTrigger } from "~/components/ui/dialog";

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
        <Dialog open={isOpen} onOpenChange={(open) => setIsOpen(open)}>
          <DialogTrigger asChild>
            <div>{Trigger}</div>
          </DialogTrigger>
          <DialogContent
            className="p-4 bg-background-gray m-0"
            hideClose={true}
            hidePadding={true}
            size="sm"
            position="top"
          >
            <div className="h-[500px] relative overflow-auto">{Content}</div>
          </DialogContent>
        </Dialog>
      </Desktop>
      <Mobile>
        <Drawer open={isOpen} onOpenChange={(open) => setIsOpen(open)}>
          <DrawerTrigger asChild>
            <div>{Trigger}</div>
          </DrawerTrigger>
          <DrawerContent className="h-full z-[55] mt-0" hideTopTrigger={true}>
            <div className="pt-7 px-2 bg-background-gray h-full">
              <h3 className="text-2xl pl-3 mb-4 font-semibold">{label}</h3>
              {Content}
            </div>
          </DrawerContent>
        </Drawer>
      </Mobile>
    </>
  );
};
