import { cn } from "~/utils";

import { IconMrgn } from "~/components/ui/icons";

type LoaderProps = {
  label?: string;
  className?: string;
};

export const Loader = ({ label = "Loading...", className }: LoaderProps) => {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 text-muted-foreground", className)}>
      <IconMrgn className="animate-pulsate" />
      <p>{label}</p>
    </div>
  );
};
