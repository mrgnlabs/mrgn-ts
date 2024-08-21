import React from "react";

import Link from "next/link";

import {
  IconBrandX,
  IconBrandDiscordFilled,
  IconBrandGithubFilled,
  IconHelp,
  IconBook,
  IconChartHistogram,
  IconMessage,
} from "@tabler/icons-react";

import { IconBrandSubstack } from "~/components/ui/icons";

const footerLinks = [
  {
    href: "https://twitter.com/marginfi",
    icon: <IconBrandX />,
  },
  {
    href: "https://discord.gg/mrgn",
    icon: <IconBrandDiscordFilled />,
  },
  {
    href: "https://mrgn.substack.com/",
    icon: <IconBrandSubstack />,
  },
  {
    href: "https://github.com/mrgnlabs",
    icon: <IconBrandGithubFilled />,
  },
  {
    href: "https://mrgn.grafana.net/public-dashboards/a2700f1bbca64aeaa5582a90dbaeb276?orgId=1&refresh=1m",
    icon: <IconChartHistogram />,
  },
  {
    href: "https://docs.marginfi.com/",
    icon: <IconBook />,
  },
  {
    href: "https://marginfi.canny.io/mrgnlend",
    icon: <IconHelp />,
  },
];

export const Footer = () => {
  return (
    <footer className="bg-background-gray text-muted-foreground fixed bottom-0 w-full px-4 py-2">
      <nav className="flex items-center justify-between">
        <Link href="/support" className="flex items-center gap-2 text-sm font-medium">
          <IconMessage size={18} /> help &amp; support
        </Link>
        <ul className="flex items-center gap-3.5 justify-end">
          {footerLinks.map((link, index) => (
            <li key={index}>
              <Link
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="transition hover:text-primary"
              >
                {React.cloneElement(link.icon, { size: 18 })}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </footer>
  );
};
