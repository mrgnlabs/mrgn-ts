import * as React from "react";
import { cn } from "@mrgnlabs/mrgn-utils";
import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border py-0.5 px-1.5 text-xs font-normal transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        primary: "bg-chartreuse text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        long: "bg-mrgn-green text-mrgn-green-foreground border-none",
        short: "bg-mrgn-red text-mrgn-red-foreground border-none",
        emode: "bg-background-gray gap-1 px-2 py-1 lowercase cursor-pointer hover:bg-background-gray-light",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(({ className, variant, ...props }, ref) => {
  return <div className={cn(badgeVariants({ variant }), className)} ref={ref} {...props} />;
});
Badge.displayName = "Badge";

export { Badge, badgeVariants };
