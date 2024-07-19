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
    href: "https://github.com/mrgnlabs",
    icon: <IconBrandGithubFilled />,
  },
  {
    href: "https://docs.marginfi.com/",
    icon: <IconBook />,
  },
];

export const Footer = () => {
  return (
    <footer className="bg-background fixed bottom-0 w-full flex items-center justify-between px-4 py-2 z-30">
      <p className="text-xs text-primary/80">
        <span className="inline-block translate-y-[1px] mr-0.5 animate-pulsate">◼️</span> built by{" "}
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
