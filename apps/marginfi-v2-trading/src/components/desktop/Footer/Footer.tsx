import React from "react";

import Link from "next/link";

import {
  IconBrandX,
  IconBrandDiscordFilled,
  IconBrandGithubFilled,
  IconBrandSubstack,
  IconHelp,
  IconBook,
  IconChartHistogram,
} from "~/components/ui/icons";

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
    <footer className="bg-background fixed bottom-0 w-full flex items-center justify-between px-4 py-2 z-30">
      <p className="text-sm">
        <span className="inline-block translate-y-[1px] mr-0.5">◼️</span> built by{" "}
        <Link href="https://www.marginfi.com" target="_blank">
          mrgn
        </Link>
        .
      </p>
      <nav>
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
