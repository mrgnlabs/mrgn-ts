import Link from "next/link";

import { IconArrowRight } from "@tabler/icons-react";

import { Button } from "~/components/ui/button";

const CONTENT = {
  heading: "Grant Gateway: Fueling Finance Applications",
  body: (
    <p>
      We are about to roll out a grants process for developers looking to benefit from our financial infrastructure.
      <br className="hidden lg:block" />
      We invite teams from everywhere to get in touch. We have a lot to offer you!
    </p>
  ),
  cta: {
    href: "#",
    label: "CTA Link Out",
  },
};

export const Callout = () => {
  return (
    <div className="container py-24 max-w-7xl mx-auto">
      <div className="flex items-center justify-between bg-secondary p-8">
        <div className="space-y-4 w-2/3">
          <h2 className="text-4xl font-medium">{CONTENT.heading}</h2>
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
