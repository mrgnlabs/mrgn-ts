import Link from "next/link";

interface PageHeadingProps {
  heading: JSX.Element;
  body?: JSX.Element;
  links: {
    href: string;
    icon: JSX.Element;
  }[];
  button?: JSX.Element;
}

export const PageHeading = ({ heading, body, links, button }: PageHeadingProps) => {
  return (
    <div className="text-muted-foreground text-base md:text-lg text-center px-2 pt-4 pb-12 md:pt-0 md:px-0 space-y-3">
      <h1 className="text-4xl font-medium text-primary">{heading}</h1>
      <div className="max-w-2xl w-full mx-auto">{body}</div>

      {links.length > 0 && (
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
