import Link from "next/link";

import { cn } from "~/utils";

interface PageHeadingProps {
  heading: string;
  body?: JSX.Element;
  links?: {
    href: string;
    icon: JSX.Element;
  }[];
  button?: JSX.Element;
  size?: "md" | "lg";
}

export const PageHeading = ({ heading, body, links, button, size = "md" }: PageHeadingProps) => {
  return (
    <div
      className={cn(
        "text-muted-foreground text-base md:text-lg text-center px-2 pt-4 pb-10 md:pt-0 md:px-0 space-y-3",
        size === "lg" && "space-y-6"
      )}
    >
      <h1 className={cn("text-4xl font-medium text-primary", size === "lg" && "text-5xl md:text-6xl")}>{heading}</h1>
      <div className="max-w-2xl w-full mx-auto">{body}</div>

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
