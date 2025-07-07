import { cn } from "@mrgnlabs/mrgn-utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulsate-faded rounded-sm bg-accent", className)} {...props} />;
}

export { Skeleton };
