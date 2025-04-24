import { cn } from "@mrgnlabs/mrgn-utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulsate rounded-md bg-muted", className)} {...props} />;
}

export { Skeleton };
