import React from "react";

import { useIsMobile } from "~/hooks/useIsMobile";
import { Desktop, Mobile } from "~/utils/mediaQueries";
import { GroupData } from "~/store/tradeStore";

import { TradingBox } from "./TradingBox";
import { Dialog, DialogTrigger, DialogContent } from "~/components/ui/dialog";
import { IconArrowLeft } from "~/components/ui/icons";

type TradingBoxDialogProps = {
  activeGroup: GroupData;
  isTradingBoxTriggered?: boolean;
  title: string;
  children: React.ReactNode;
};

export const TradingBoxDialog = ({
  activeGroup,
  isTradingBoxTriggered = false,
  title,
  children,
}: TradingBoxDialogProps) => {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const isMobile = useIsMobile();

  React.useEffect(() => {
    setIsDialogOpen(isTradingBoxTriggered);
  }, [setIsDialogOpen, isTradingBoxTriggered]);

  return (
    <Dialog open={isDialogOpen} modal={!isMobile} onOpenChange={(open) => setIsDialogOpen(open)}>
      <Mobile>
        {isDialogOpen && <div className="fixed inset-0 h-screen z-40 md:z-50 bg-background md:bg-background/80" />}
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent
          hideClose={true}
          className="mt-20 justify-start flex md:max-w-[520px] md:py-3 md:px-5 p-0 sm:rounded-2xl bg-transparent border-none z-40 md:z-50"
        >
          <div>
            <div
              className="flex gap-2 items-center capitalize pl-2 cursor-pointer hover:underline"
              onClick={() => setIsDialogOpen(false)}
            >
              <IconArrowLeft /> {`${title}`}
            </div>
            <div className="p-4 h-screen mb-8">
              <TradingBox activeGroup={activeGroup} />
            </div>
          </div>
        </DialogContent>
      </Mobile>

      <Desktop>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent
          className="md:flex md:max-w-[520px] md:py-3 md:px-5 p-0 sm:rounded-2xl bg-transparent border-none"
          closeClassName="top-2 right-2"
        >
          <div className="p-4">
            <TradingBox activeGroup={activeGroup} />
          </div>
        </DialogContent>
      </Desktop>
    </Dialog>
  );
};
