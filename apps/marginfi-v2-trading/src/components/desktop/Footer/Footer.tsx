import React from "react";

import Link from "next/link";

import { motion } from "framer-motion";

import { IconBrandX, IconBrandDiscordFilled, IconBrandGithubFilled, IconBook } from "~/components/ui/icons";

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
    <motion.footer
      className="bg-background fixed bottom-0 w-full flex items-center justify-between px-4 py-2 z-30"
      style={{
        boxShadow: "0 -4px 30px 0 rgba(0, 0, 0, 0.075)",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 4 }}
    >
      <p className="text-xs text-primary/80">
        <span className="inline-block translate-y-[1px] mr-0.5 animate-pulsate">◼️</span> built by{" "}
        <Link href="https://www.marginfi.com" target="_blank">
          mrgn
        </Link>
        .
      </p>
      <Link
        href="https://github.com/mrgnlabs/marginfi-v2/tree/main/audits"
        target="blank"
        className="text-xs text-primary/80 italic border-b border-transparent transition-colors hover:border-primary"
      >
        Audited by Ottersec and Sec3
      </Link>
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
    </motion.footer>
  );
};
