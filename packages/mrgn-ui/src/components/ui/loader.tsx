import { cn } from "@mrgnlabs/mrgn-utils";

import { IconMrgn } from "~/components/ui/icons";

type LoaderProps = {
  label?: string;
  className?: string;
  iconSize?: number;
};

export const Loader = ({ label = "Loading...", className, iconSize }: LoaderProps) => {
  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-2 text-muted-foreground animate-pulsate", className)}
    >
      <IconMrgn size={iconSize} />
      <p>{label}</p>
    </div>
  );
};
