import { cn } from "~/utils";

import { IconMrgn } from "~/components/ui/icons";

type LoaderProps = {
  label?: string;
  className?: string;
  iconSize?: number;
};

export const Loader = ({ label = "Loading...", className, iconSize }: LoaderProps) => {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 text-muted-foreground", className)}>
      <IconMrgn className="animate-pulsate" size={iconSize} />
      <p>{label}</p>
    </div>
  );
};
