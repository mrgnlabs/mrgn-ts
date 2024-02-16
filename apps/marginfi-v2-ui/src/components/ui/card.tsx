import * as React from "react";

import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "~/utils/themeUtils";

const cardVariants = cva("rounded-xl shadow", {
  variants: {
    variant: {
      default: "border bg-card text-card-foreground",
      secondary: "bg-muted border border-muted-foreground/10 text-card-foreground",
      light: "border bg-primary text-primary-foreground",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface CardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {
  asChild?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, variant, asChild = false, ...props }, ref) => (
  <div ref={ref} className={cn(cardVariants({ variant, className }))} {...props} />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("font-semibold leading-none tracking-tight", className)} {...props} />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => <p ref={ref} className={cn("text-sm", className)} {...props} />
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
