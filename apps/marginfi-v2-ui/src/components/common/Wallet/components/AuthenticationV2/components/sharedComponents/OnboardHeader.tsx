import { DialogDescription, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { IconMrgn } from "~/components/ui/icons";
import { cn } from "~/utils";

interface props {
  title: string;
  description: string;
  size?: "lg" | "sm";
}

export const OnboardHeader = ({ title, description, size = "lg" }: props) => {
  return (
    <DialogHeader>
      <IconMrgn size={48} />
      <DialogTitle className={cn(size === "lg" ? "text-3xl" : "text-2xl", "pt-4")}>{title}</DialogTitle>
      <DialogDescription>{description}</DialogDescription>
    </DialogHeader>
  );
};
