import Link from "next/link";

import { Button } from "~/components/ui/button";

import { cn } from "~/lib/utils";

type FeatureBlockCenteredProps = {
  heading: string;
  body: string;
  actions?: {
    href: string;
    text: string;
    label?: string;
  }[];
};

export const FeatureBlockCentered = ({ heading, body, actions }: FeatureBlockCenteredProps) => {
  return (
    <div className="w-full py-12 px-6">
      <div className="flex flex-col items-center text-center w-full max-w-3xl mx-auto">
        <h3 className="mb-4 text-3xl font-medium text-center md:text-5xl">{heading}</h3>
        <p className="text-muted-foreground md:text-lg">{body}</p>
        {actions && (
          <div className="w-full flex flex-col items-center gap-4 mt-12 sm:w-72 md:w-auto md:flex-row md:gap-8">
            {actions.map((action, index) => (
              <Button key={index} size="lg" className={cn("w-full lg:w-auto", action.label && "py-6")}>
                <Link href={action.href} className="flex flex-col gap-0.5 leading-none">
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
