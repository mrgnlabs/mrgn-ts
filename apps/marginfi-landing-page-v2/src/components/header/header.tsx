import Link from "next/link";
import { Button } from "~/components/ui/button";
import { IconMrgn, IconBrandXFilled, IconBrandDiscordFilled, IconBrandGithubFilled } from "~/components/ui/icons";

const navItema = [
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
];

export const Header = () => {
  return (
    <header className="fixed top-0 left-0 w-full flex items-center justify-between gap-4 py-4 px-6 bg-background">
      <IconMrgn size={42} />
      <nav className="ml-8 text-sm">
        <ul className="flex items-center gap-6">
          {navItema.map((item, index) => (
            <li key={index}>
              <Link
                href={item.href}
                className="border-b border-transparent transition-colors hover:border-mrgn-chartreuse"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <ul className="flex items-center gap-6 ml-auto mr-6">
        <li>
          <Link href="#">
            <IconBrandXFilled size={20} />
          </Link>
        </li>
        <li>
          <Link href="#">
            <IconBrandDiscordFilled size={20} />
          </Link>
        </li>
        <li>
          <Link href="#">
            <IconBrandGithubFilled size={20} />
          </Link>
        </li>
      </ul>
      <Button>Launch App</Button>
    </header>
  );
};
