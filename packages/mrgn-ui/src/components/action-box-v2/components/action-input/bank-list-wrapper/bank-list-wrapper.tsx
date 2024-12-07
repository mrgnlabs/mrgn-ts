import React from "react";

import { useOs, useIsMobile, cn } from "@mrgnlabs/mrgn-utils";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTrigger } from "~/components/ui/drawer";
import { is } from "superstruct";

type BankListWrapperProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  Trigger: React.JSX.Element;
  Content: React.JSX.Element;
  label?: string;
};

export const BankListWrapper = ({
  isOpen,
  setIsOpen,
  Trigger,
  Content,
  label = "Select Token",
}: BankListWrapperProps) => {
  const { isIOS, isPWA } = useOs();
  const isMobile = useIsMobile();

  const shouldShowDialog = !isMobile || (isIOS && isPWA);

  return shouldShowDialog ? (
    <Dialog open={isOpen} onOpenChange={(open) => setIsOpen(open)}>
      <DialogTrigger asChild>
        <div>{Trigger}</div>
      </DialogTrigger>
      <DialogContent
        className={cn("p-4 bg-mfi-action-box-background m-0", isIOS && isPWA && "justify-start")}
        hideClose={true}
        hidePadding={true}
        size="sm"
        position="top"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>Select a token to add to your wallet</DialogDescription>
        </DialogHeader>
        <div className="h-[500px] relative overflow-auto">{Content}</div>
      </DialogContent>
    </Dialog>
  ) : (
    <Drawer open={isOpen} onOpenChange={(open) => setIsOpen(open)}>
      <DrawerTrigger asChild>
        <div>{Trigger}</div>
      </DrawerTrigger>
      <DrawerContent className="h-full z-[55] mt-0" hideTopTrigger={true}>
        <div className="pt-7 px-2 bg-mfi-action-box-background h-full">
          <h3 className="text-2xl pl-3 mb-4 font-semibold">{label}</h3>
          {Content}
        </div>
      </DrawerContent>
    </Drawer>
  );
};
