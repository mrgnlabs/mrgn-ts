"use client";

import React from "react";

import Link from "next/link";

import { IconArrowRight } from "@tabler/icons-react";
import { motion, useInView } from "framer-motion";

import { cn } from "~/lib/utils";

import { Button } from "~/components/ui/button";

const CONTENT = {
  heading: (
    <>
      Developers and users are
      <br className="hidden md:block" /> capturing native yield in 3 ways:
    </>
  ),
  products: [
    {
      heading: "mrgnlend",
      subHeading: (
        <span>
          marginfi&apos;s borrowing and
          <br className="hidden xl:block" /> lending venue
        </span>
      ),
      cta: {
        href: "https://app.marginfi.com/",
        label: "Start earning",
      },
    },
    {
      heading: "LST / YBX",
      subHeading: "Solana's highest yield accruing SOL token and stable-asset",
      cta: {
        href: "https://app.marginfi.com/mint",
        label: "Mint LST",
      },
    },
    {
      heading: "mrgnswap",
      subHeading: "Crypto's first ever integrated stableswap",
      cta: {
        href: "#",
        label: "Coming soon...",
      },
    },
  ],
};

export const Products = () => {
  const targetRef = React.useRef(null);
  const isInView = useInView(targetRef);

  const fadeVariants = {
    hidden: { opacity: 0, y: 10, transition: { duration: 1 } },
    visible: { opacity: 1, y: 0, transition: { duration: 1 } },
  };

  const containerVariants = {
    hidden: {
      transition: {
        staggerChildren: 0.25,
        staggerDirection: -1,
      },
    },
    visible: {
      transition: {
        staggerChildren: 0.25,
      },
    },
  };

  return (
    <div ref={targetRef} className="relative z-20" id="products">
      <div className="container space-y-24 py-16 lg:py-24 xl:py-32">
        <h2 className="text-4xl max-w-4xl mx-auto w-full font-medium text-center lg:text-5xl">{CONTENT.heading}</h2>
        <motion.ul
          className="max-w-2xl px-4 w-full flex flex-col justify-between mx-auto gap-16 sm:px-8 md:text-center md:items-center xl:px-0 lg:text-left lg:items-start lg:max-w-7xl lg:grid lg:gap-16 lg:grid-cols-3 xl:gap-28"
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={containerVariants}
        >
          {CONTENT.products.map((product, index) => {
            const isDisabled = product.cta.href === "#";
            return (
              <motion.li key={index} className="relaative space-y-6" variants={fadeVariants}>
                <header className="lg:space-y-1">
                  <h2
                    className="text-5xl font-medium text-transparent bg-clip-text py-1.5 lg:max-w-fit lg:text-6xl xl:text-7xl"
                    style={{
                      backgroundImage: "linear-gradient(90.08deg, #97AFB9 54.29%, #42535A 88.18%, #2B3539 115.29%)",
                    }}
                  >
                    {product.heading}
                  </h2>
                  <h3 className="lg:text-lg xl:text-xl">{product.subHeading}</h3>
                </header>
                <Link
                  className={cn("inline-block", isDisabled && "pointer-events-none cursor-default")}
                  href={product.cta.href}
                >
                  <Button disabled={isDisabled}>
                    {product.cta.label} <IconArrowRight size={18} className="ml-2" />
                  </Button>
                </Link>
              </motion.li>
            );
          })}
        </motion.ul>
      </div>
    </div>
  );
};
