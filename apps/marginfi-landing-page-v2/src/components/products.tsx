"use client";

import React from "react";

import Link from "next/link";

import { IconArrowRight } from "@tabler/icons-react";
import { motion, useInView } from "framer-motion";

import { cn } from "~/lib/utils";

import { Button } from "~/components/ui/button";

const CONTENT = {
  heading: "Developers and users are capturing native yield in 3 ways:",
  products: [
    {
      heading: "LST / YBX",
      subHeading: "Solana's highest yielding liquid staking SOL token and capital-efficient, decentralized stablecoin",
      cta: {
        href: "https://app.marginfi.com/mint",
        label: "Mint LST",
      },
    },
    {
      heading: "mrgnlend",
      subHeading: (
        <span>
          marginfi's integrated
          <br className="hidden lg:block" /> leverage hub
        </span>
      ),
      cta: {
        href: "https://app.marginfi.com/",
        label: "Start earning",
      },
    },
    {
      heading: "mrgnswap",
      subHeading: "Elit et exercitation ea voluptate duis ad laboris consequat dolor labore dolore incididunt.",
      cta: {
        href: "#",
        label: "coming soon...",
      },
    },
  ],
};

export const Products = () => {
  const targetRef = React.useRef(null);
  const isInView = useInView(targetRef, {
    amount: 0.8,
  });

  const fadeVariants = {
    hidden: { opacity: 0, y: 10, transition: { duration: 1 } },
    visible: { opacity: 1, y: 0, transition: { duration: 1 } },
  };

  const containerVariants = {
    hidden: {
      transition: {
        staggerChildren: 0.15,
        staggerDirection: -1, // Stagger in reverse for hiding
      },
    },
    visible: {
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  return (
    <div ref={targetRef} className="relative z-20" id="products">
      <div className="container space-y-24 py-16 lg:py-24">
        <h2 className="text-4xl max-w-4xl mx-auto w-full font-medium text-center lg:text-5xl">{CONTENT.heading}</h2>
        <motion.ul
          className="max-w-7xl mx-auto w-full grid gap-16 lg:translate-x-12 lg:grid-cols-3 lg:gap-28"
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={containerVariants}
        >
          {CONTENT.products.map((product, index) => {
            const isDisabled = product.cta.href === "#";
            return (
              <motion.li key={index} className="relaative space-y-6" variants={fadeVariants}>
                <header className="space-y-1">
                  <h2
                    className="text-7xl font-medium text-transparent bg-clip-text py-1.5 max-w-fit"
                    style={{
                      backgroundImage: "linear-gradient(90.08deg, #97AFB9 54.29%, #42535A 88.18%, #2B3539 115.29%)",
                    }}
                  >
                    {product.heading}
                  </h2>
                  <h3 className="text-[22px]">{product.subHeading}</h3>
                </header>
                <Link className={cn("inline-block", isDisabled && "cursor-default")} href={product.cta.href}>
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
