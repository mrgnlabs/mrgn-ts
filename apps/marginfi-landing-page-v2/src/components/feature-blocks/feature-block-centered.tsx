import Link from "next/link";

import { cva, type VariantProps } from "class-variance-authority";

import { Button } from "~/components/ui/button";

import { cn } from "~/lib/utils";

import type { Action } from "~/types";

const featuredBlockVariants = cva("w-full py-12 px-6", {
  variants: {
    variant: {
      default: "bg-transparent",
      secondary: "bg-background border-t border-b border-border py-16",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

interface FeatureBlockCenteredProps extends VariantProps<typeof featuredBlockVariants> {
  heading: string;
  body: string;
  actions?: Action[];
}

export const FeatureBlockCentered = ({ variant = "default", heading, body, actions }: FeatureBlockCenteredProps) => {
  return (
    <div className={cn(featuredBlockVariants({ variant }))}>
      <div className="flex flex-col items-center text-center w-full max-w-3xl mx-auto">
        <h3 className="mb-4 text-3xl font-medium text-center md:text-5xl">{heading}</h3>
        <p className="text-muted-foreground md:text-lg">{body}</p>
        {actions && (
          <div className="w-72 flex flex-col items-center gap-4 mt-12 md:w-auto md:flex-row md:gap-8">
            {actions.map((action, index) => (
              <Button
                key={index}
                variant={index % 2 !== 0 ? "secondary" : "default"}
                className={cn(
                  "w-full lg:w-auto",
                  action.label && "py-6",
                  index % 2 !== 0 && "py-5",
                  index % 2 !== 0 && action.label && "py-[26px]"
                )}
              >
                <Link
                  href={action.href}
                  className={cn("flex flex-col gap-0.5 leading-none", index % 2 !== 0 && "gap-1")}
                >
                  {action.text}
                  {action.label && <small className="text-xs font-light">{action.label}</small>}
                </Link>
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
