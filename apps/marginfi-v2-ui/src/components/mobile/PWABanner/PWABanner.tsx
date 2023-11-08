import { Sheet, SheetContent } from "~/components/ui/sheet";
import { IconMrgn, IconShare2, IconArrowDown } from "~/components/ui/icons";

type PWABannerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const PWABanner = ({ open, onOpenChange }: PWABannerProps) => {
  return (
    <Sheet open={open} onOpenChange={(open) => onOpenChange(open)}>
      <SheetContent className="outline-none" side="bottom">
        <div className="flex flex-col items-center gap-4 justify-center px-4">
          <IconMrgn size={40} />
          <p>
            Install the marginfi app. Open in safari, tap share{" "}
            <IconShare2 size={16} className="inline relative -translate-y-0.5" />, and then add to home screen{" "}
            <IconArrowDown size={16} className="inline relative -translate-y-[1px]" />
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};
