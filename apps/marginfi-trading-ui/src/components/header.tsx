import Link from "next/link";

import { Button } from "~/components/ui/button";
import { Logo } from "~/components/ui/logo";

export const Header = () => {
  return (
    <header className="flex items-center justify-between gap-8 p-4 lg:py-6 lg:px-8">
      <Logo size={32} />
      <nav className="ml-auto hidden lg:block">
        <ul className="flex items-center gap-8">
          <li>
            <Link href="/">
              <Button variant="ghost">trending</Button>
            </Link>
          </li>
          <li>
            <Link href="/trade">
              <Button variant="ghost">trade</Button>
            </Link>
          </li>
          <li>
            <Link href="/portfolio">
              <Button variant="ghost">portfolio</Button>
            </Link>
          </li>
        </ul>
      </nav>
      <Button>Sign In</Button>
    </header>
  );
};
