import Link from "next/link";

import { cn } from "~/lib/utils";

// import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/components/ui/accordion";
import { IconBrandDiscordFilled, IconBrandGithubFilled, IconBrandXFilled, IconMrgn } from "~/components/ui/icons";

type NavItems = {
  [key: string]: { label: string; href: string }[];
};

const navItems: NavItems = {
  About: [
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
  ],
  "Proident Anim": [
    {
      label: "Excepteur Lorem ",
      href: "#",
    },
    {
      label: "Irure Dolore",
      href: "#",
    },
    {
      label: "Do Officia",
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
        "w-full py-10 px-6 flex flex-col justify-between items-center gap-12 mt-16 border-t border-border",
        "lg:gap-16 lg:pt-12 lg:pb-6",
        "xl:flex-row xl:items-start xl:gap-8 xl:pt-10 xl:pb-6"
      )}
    >
      <div className="flex flex-col gap-4 justify-between h-full">
        <div className="flex flex-col gap-4 items-center lg:items-start">
          <div className="flex items-center gap-4 text-3xl">
            <IconMrgn size={42} />
            marginfi
          </div>
          <small className="block text-xs text-muted-foreground">
            {new Date().getFullYear()} &copy; Margin Labs INC. All rights reserved.
          </small>
        </div>
        <ul className="items-center gap-6 text-xs hidden lg:flex">
          <li>
            <Link href="" className="text-muted-foreground transition-colors hover:text-primary">
              Terms of Service
            </Link>
          </li>
          <li>
            <Link href="" className="text-muted-foreground transition-colors hover:text-primary">
              Privacy Policy
            </Link>
          </li>
        </ul>
      </div>

      <div className="hidden relative text-sm w-full min-h-[240px] justify-between lg:flex">
        <div className="flex gap-32 ml-40">
          {Object.keys(navItems).map((key, index) => (
            <div key={index} className="w-full space-y-4 min-w-fit">
              <h4 className="font-medium">{key}</h4>
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
        <ul className="absolute bottom-0 right-0 items-center gap-6 text-xs hidden lg:flex self-end">
          <li>
            <Link href="">
              <IconBrandXFilled size={20} />
            </Link>
          </li>
          <li>
            <Link href="">
              <IconBrandDiscordFilled size={20} />
            </Link>
          </li>
          <li>
            <Link href="">
              <IconBrandGithubFilled size={20} />
            </Link>
          </li>
        </ul>
      </div>

      <div className="md:hidden w-full">
        {/* {Object.keys(navItems).map((key, index) => (
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
        ))} */}
      </div>

      <ul className="flex items-center gap-6 text-xs lg:hidden">
        <li>
          <Link href="" className="text-muted-foreground transition-colors hover:text-primary">
            Terms of Service
          </Link>
        </li>
        <li>
          <Link href="" className="text-muted-foreground transition-colors hover:text-primary">
            Privacy Policy
          </Link>
        </li>
      </ul>
    </footer>
  );
};
