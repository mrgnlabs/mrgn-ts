import Link from "next/link";
import { Button } from "~/components/ui/button";
import {
  IconMrgn,
  IconBrandXFilled,
  IconBrandDiscordFilled,
  IconBrandGithubFilled,
  IconMenu,
} from "~/components/ui/icons";

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
    <header className="fixed top-0 left-0 w-full py-3 px-6">
      <div className="hidden lg:flex items-center justify-between gap-4">
        <IconMrgn size={42} />
        <nav className="hidden lg:block ml-8 text-sm">
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
        <ul className="hidden lg:flex items-center gap-6 ml-auto mr-6">
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
        <Button className="hidden lg:flex">Launch App</Button>
      </div>
      <div className="flex items-center gap-4 justify-between lg:hidden">
        <IconMrgn size={34} />
        <Button variant="ghost" size="icon">
          <IconMenu />
        </Button>
      </div>
    </header>
  );
};
