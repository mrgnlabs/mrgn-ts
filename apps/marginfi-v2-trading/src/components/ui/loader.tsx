import { cn } from "~/utils";

import { IconArena } from "~/components/ui/icons";

type LoaderProps = {
  label?: string;
  className?: string;
  iconSize?: number;
};

export const Loader = ({ label = "Loading...", className, iconSize = 24 }: LoaderProps) => {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 text-muted-foreground", className)}>
      <IconArena className="animate-pulsate" size={iconSize} />
      <p>{label}</p>
    </div>
  );
};
