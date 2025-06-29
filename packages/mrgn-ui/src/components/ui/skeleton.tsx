import { cn } from "@mrgnlabs/mrgn-utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulsate rounded-sm bg-muted opacity-35", className)} {...props} />;
}

export { Skeleton };
