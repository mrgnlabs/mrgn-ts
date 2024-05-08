import { DialogDescription, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { IconMrgn } from "~/components/ui/icons";

interface props {
  title: string;
  description: string;
}

export const OnboardHeader = ({ title, description }: props) => {
  return (
    <DialogHeader>
      <IconMrgn size={48} />
      <DialogTitle>{title}</DialogTitle>
      <DialogDescription>{description}</DialogDescription>
    </DialogHeader>
  );
};
