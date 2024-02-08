import Link from "next/link";

import { cn } from "~/lib/utils";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/components/ui/accordion";
import { IconMrgn } from "~/components/ui/icons";

type NavItems = {
  [key: string]: { label: string; href: string }[];
};

const navItems: NavItems = {
  Marginfi: [
    {
      label: "Product",
      href: "#",
    },
    {
      label: "Developers",
      href: "#",
    },
    {
      label: "Ecosystem",
      href: "#",
    },
    {
      label: "Community",
      href: "#",
    },
  ],
  Resources: [
    {
      label: "Documentation",
      href: "#",
    },
    {
      label: "Github",
      href: "#",
    },
    {
      label: "Analytics",
      href: "#",
    },
    {
      label: "Terms of Service",
      href: "#",
    },
    {
      label: "Privacy Policy",
      href: "#",
    },
  ],
  Community: [
    {
      label: "Twitter",
      href: "#",
    },
    {
      label: "Discord",
      href: "#",
    },
    {
      label: "Github",
      href: "#",
    },
  ],
};

export const Footer = () => {
  return (
    <footer
      className={cn(
        "w-full py-10 px-6 flex flex-col justify-between items-center gap-12 border-t border-border bg-background",
        "md:gap-16 md:py-12",
        "lg:flex-row lg:items-start lg:gap-8 lg:py-10"
      )}
    >
      <div className="flex flex-col gap-4 items-center lg:items-start">
        <div className="flex items-center gap-4 text-3xl">
          <IconMrgn size={42} />
          marginfi
        </div>
        <small className="block text-xs text-muted-foreground">
          {new Date().getFullYear()} &copy; Margin Labs INC. All rights reserved.
        </small>
      </div>

      <div className="hidden gap-32 text-sm md:flex lg:ml-auto">
        {Object.keys(navItems).map((key, index) => (
          <div key={index} className="w-full space-y-4 min-w-fit">
            <h4 className=" text-base">{key}</h4>
            <ul className="space-y-2 w-full">
              {navItems[key].map((item, index) => (
                <li key={index}>
                  <Link href={item.href} className="text-muted-foreground transition-colors hover:text-primary">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="md:hidden w-full">
        {Object.keys(navItems).map((key, index) => (
          <Accordion key={index} type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="hover:no-underline">{key}</AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2 w-full">
                  {navItems[key].map((item, index) => (
                    <li key={index}>
                      <Link href={item.href} className="text-muted-foreground transition-colors hover:text-primary">
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ))}
      </div>
    </footer>
  );
};
