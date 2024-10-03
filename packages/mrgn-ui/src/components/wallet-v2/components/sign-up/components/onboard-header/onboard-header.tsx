import { IconArrowLeft } from "@tabler/icons-react";

import { DialogDescription, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { IconMrgn, IconArena } from "~/components/ui/icons";
import { cn } from "@mrgnlabs/mrgn-utils";

interface props {
  title: string;
  description?: string;
  onPrev?: () => void;
  size?: "lg" | "sm";
}

export const OnboardHeader = ({ onPrev, title, description, size = "lg" }: props) => {
  return (
    <DialogHeader className="mb-8 px-2 md:px-8">
      {onPrev && (
        <div className="absolute left-4 top-4 opacity-70 cursor-pointer" onClick={() => onPrev()}>
          <IconArrowLeft />
        </div>
      )}
      {process.env.NEXT_PUBLIC_APP_ID === "marginfi-v2-ui" ? <IconMrgn size={48} /> : <IconArena size={48} />}
      <DialogTitle className={cn(size === "lg" ? "text-3xl" : "text-2xl", "pt-2")}>{title}</DialogTitle>
      {description && <DialogDescription>{description}</DialogDescription>}
    </DialogHeader>
  );
};
