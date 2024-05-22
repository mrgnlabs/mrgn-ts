import { DialogDescription, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { IconArrowLeft, IconMrgn } from "~/components/ui/icons";
import { cn } from "~/utils";

interface props {
  title: string;
  description: string;
  onPrev?: () => void;
  size?: "lg" | "sm";
}

export const OnboardHeader = ({ onPrev, title, description, size = "lg" }: props) => {
  return (
    <DialogHeader>
      {onPrev && (
        <div className="absolute left-4 opacity-70 cursor-pointer" onClick={() => onPrev()}>
          <IconArrowLeft />
        </div>
      )}
      <IconMrgn size={48} />
      <DialogTitle className={cn(size === "lg" ? "text-3xl" : "text-2xl", "pt-4")}>{title}</DialogTitle>
      <DialogDescription>{description}</DialogDescription>
    </DialogHeader>
  );
};
