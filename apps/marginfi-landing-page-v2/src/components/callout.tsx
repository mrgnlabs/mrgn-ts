import Link from "next/link";

import { IconArrowRight } from "@tabler/icons-react";

import { Button } from "~/components/ui/button";

const CONTENT = {
  heading: "Grant Gateway: Fueling the mrgn. ecosystem",
  body: (
    <p>
      Create a grant proposal to build something iconic with marginfi's liquidity, userbase, and tooling.
      <br className="hidden lg:block" />
      There's support waiting for you!
    </p>
  ),
  cta: {
    href: "#",
    label: "CTA Link Out",
  },
};

export const Callout = () => {
  return (
    <div className="relative z-10 container py-24 max-w-7xl mx-auto">
      <div className="flex flex-col justify-between bg-secondary rounded-lg p-8 gap-8 lg:gap-0 lg:flex-row lg:items-center">
        <div className="space-y-4 lg:w-2/3">
          <h2 className="text-2xl font-medium lg:text-4xl">{CONTENT.heading}</h2>
          <div className="text-muted-foreground">{CONTENT.body}</div>
        </div>
        <Link href={CONTENT.cta.href} target="_blank" rel="noreferrer">
          <Button>
            {CONTENT.cta.label} <IconArrowRight size={18} className="ml-1.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
};
