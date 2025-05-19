import Link from "next/link";
import { cn } from "@mrgnlabs/mrgn-utils";

interface PageHeadingProps {
  heading: string | JSX.Element;
  size?: "md" | "lg";
  body?: JSX.Element;
  links?: {
    href: string;
    icon: JSX.Element;
  }[];
  button?: JSX.Element;
}

export const PageHeading = ({ heading, body, links, button, size = "md" }: PageHeadingProps) => {
  return (
    <div
      className={cn(
        "text-muted-foreground text-center px-8 pt-4 pb-6 text-base space-y-4 md:pb-12 md:pt-0 md:px-0",
        size === "lg" ? "md:text-xl md:space-y-6" : "md:text-lg"
      )}
    >
      <h1 className={cn("font-medium text-primary text-4xl", size === "lg" && "md:text-5xl")}>{heading}</h1>
      <div className={cn("w-full mx-auto leading-relaxed", size === "lg" ? "max-w-[51rem]" : "max-w-2xl")}>{body}</div>

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
