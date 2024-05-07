import Link from "next/link";

import { IconArrowRight } from "@tabler/icons-react";

import { Button } from "~/components/ui/button";

const CONTENT = {
  heading: "Developers and users are capturing native yield in 3 ways:",
  products: [
    {
      heading: "mrgnlend",
      subHeading: "marginfi's integrated leverage hub",
      cta: {
        href: "https://app.marginfi.com/",
        label: "Start earning",
      },
    },
    {
      heading: "LST",
      subHeading: "Solana's highest yielding liquid staking SOL token",
      cta: {
        href: "https://app.marginfi.com/",
        label: "Mint LST",
      },
    },
    {
      heading: "YBX",
      subHeading: "marginfi's capital-efficient, decentralized stablecoin",
      cta: {
        href: "https://app.marginfi.com/",
        label: "Mint YBX",
      },
    },
  ],
};

export const Products = () => {
  return (
    <div className="relative z-20" id="products">
      <div className="container space-y-24 py-24 px-4">
        <h2 className="text-3xl max-w-4xl mx-auto w-full font-medium text-center lg:text-5xl">{CONTENT.heading}</h2>
        <ul className="max-w-7xl mx-auto w-full grid grid-cols-1 gap-12 lg:grid-cols-3 lg:gap-28 lg:translate-x-12">
          {CONTENT.products.map((product, index) => (
            <li key={index} className="relaative space-y-6">
              <header className="space-y-1">
                <h2
                  className="text-6xl font-medium text-transparent bg-clip-text py-1.5 max-w-fit lg:text-7xl"
                  style={{
                    backgroundImage: "linear-gradient(90.08deg, #97AFB9 54.29%, #42535A 88.18%, #2B3539 115.29%)",
                  }}
                >
                  {product.heading}
                </h2>
                <h3 className="text-[22px]">{product.subHeading}</h3>
              </header>
              <Link className="inline-block" href={product.cta.href}>
                <Button>
                  {product.cta.label} <IconArrowRight size={18} className="ml-2" />
                </Button>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
