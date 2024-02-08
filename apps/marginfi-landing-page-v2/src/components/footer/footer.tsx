import Link from "next/link";

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
    <footer className="w-full py-8 px-6 flex justify-between items-start gap-4 border-t border-border bg-background">
      <div className="space-y-4">
        <div className="flex items-center gap-4 text-3xl">
          <IconMrgn size={42} />
          marginfi
        </div>
        <small className="block text-xs text-muted-foreground">
          {new Date().getFullYear()} &copy; Margin Labs INC. All rights reserved.
        </small>
      </div>
      <div className="flex gap-24 ml-auto text-sm">
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
    </footer>
  );
};
