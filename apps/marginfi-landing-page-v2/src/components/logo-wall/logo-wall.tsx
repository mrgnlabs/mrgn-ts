import Image from "next/image";
import Link from "next/link";

type LogoWallProps = {
  heading: string;
  body?: string;
  logos: {
    img: string;
    href: string;
  }[];
};

export const LogoWall = ({ heading, body, logos }: LogoWallProps) => {
  return (
    <div className="space-y-8 py-20 px-6 w-full max-w-6xl mx-auto">
      <header className="space-y-3 w-full flex flex-col items-center text-center">
        <h2 className="text-3xl font-medium">{heading}</h2>
        {body && <p className="text-muted-foreground w-full max-w-xl mx-auto">{body}</p>}
      </header>
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {logos.map((logo, index) => (
          <li key={index}>
            <Link href={logo.href} className="w-full h-full block relative min-h-[200px]">
              <Image key={index} src={logo.img} alt={`${heading} logo`} fill={true} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};
