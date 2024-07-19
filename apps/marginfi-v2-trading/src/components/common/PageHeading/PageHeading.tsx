import Link from "next/link";

import { motion } from "framer-motion";

import { cn } from "~/utils";

interface PageHeadingProps {
  heading: JSX.Element | string;
  body?: JSX.Element;
  links?: {
    href: string;
    icon: JSX.Element;
  }[];
  button?: JSX.Element;
  size?: "md" | "lg";
  animate?: boolean;
}

export const PageHeading = ({ heading, body, links, button, size = "md", animate = false }: PageHeadingProps) => {
  return (
    <div
      className={cn(
        "text-muted-foreground text-base md:text-lg text-center px-2 pt-4 pb-10 md:pt-0 md:px-0 space-y-3",
        size === "lg" && "text-primary/80 space-y-5 text-lg md:text-2xl"
      )}
    >
      <motion.h1
        className={cn("text-5xl font-medium text-primary font-orbitron", size === "lg" && "text-5xl md:text-6xl")}
        initial={{ opacity: animate ? 0 : 1 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        {heading}
      </motion.h1>
      <motion.div
        className="max-w-2xl w-full mx-auto"
        initial={{ opacity: animate ? 0 : 1 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        {body}
      </motion.div>

      {links && links.length > 0 && (
        <ul className="flex items-center gap-4 justify-center pt-2">
          {links.map((link, idx) => (
            <li key={idx}>
              <Link
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-chartreuse"
              >
                {link.icon}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {button && <div className="flex justify-center pt-4">{button}</div>}
    </div>
  );
};
