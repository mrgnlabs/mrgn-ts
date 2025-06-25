import React from "react";

import Link from "next/link";

import { IconBrandDiscordFilled, IconBrandGithub, IconBrandX } from "@tabler/icons-react";

import { Logo } from "~/components/ui/logo";
import { IconBrandSubstack } from "~/components/ui/icons";

const CONTENT: {
  links: {
    heading: string;
    list: {
      icon?: JSX.Element;
      href: string;
      label: string;
    }[];
  }[];
} = {
  links: [
    {
      heading: "Learn More",
      list: [
        {
          href: "https://docs.marginfi.com",
          label: "Documentation",
        },
        {
          href: "https://github.com/mrgnlabs/",
          label: "GitHub",
        },
      ],
    },
    {
      heading: "Resources",
      list: [
        {
          href: "https://github.com/mrgnlabs/marginfi-v2/tree/main/audits",
          label: "Audits",
        },
      ],
    },
    {
      heading: "Community",
      list: [
        {
          icon: <IconBrandX />,
          href: "https://twitter.com/marginfi",
          label: "X",
        },
        // {
        //   icon: <IconBrandDiscordFilled />,
        //   href: "https://discord.gg/pJ3U7gHJFe",
        //   label: "Discord",
        // },
        {
          icon: <IconBrandGithub />,
          href: "https://github.com/mrgnlabs/",
          label: "GitHub",
        },
        {
          icon: <IconBrandSubstack />,
          href: "https://mrgn.substack.com/",
          label: "Substack",
        },
      ],
    },
  ],
};

export const Footer = () => {
  return (
    <footer className="bg-background/60 relative z-10 border-t border-border py-12">
      <div className="flex justify-between gap-4 w-full pl-4 pr-16 lg:pl-8">
        <div className="flex flex-col gap-4 w-3/5 shrink-0">
          <Logo size={36} wordmark={true} />
          <small className="text-muted-foreground">
            {new Date().getFullYear()} &copy; MRGN, INC. All rights reserved.
          </small>
        </div>

        <div className="hidden justify-between w-full pt-4 lg:flex">
          {CONTENT.links.map((category, index) => (
            <ul key={index} className="space-y-2">
              <li className="text-muted-foreground">{category.heading}</li>
              <ul className="space-y-2">
                {category.list.map((item, index) => (
                  <li key={index}>
                    <Link className="flex items-center gap-1" href={item.href} target="_blank" rel="noreferrer">
                      {item.icon && React.cloneElement(item.icon, { size: 18 })}
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </ul>
          ))}
        </div>
      </div>
    </footer>
  );
};
