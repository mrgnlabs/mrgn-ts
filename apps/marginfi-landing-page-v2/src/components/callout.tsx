"use client";

import React from "react";

import Link from "next/link";

import { IconArrowRight } from "@tabler/icons-react";
import { motion, useInView } from "framer-motion";

import { Button } from "~/components/ui/button";

const CONTENT = {
  heading: "Grant Gateway: Fueling the mrgn. ecosystem",
  body: (
    <p>
      Create a grant proposal to build something iconic with marginfi&apos;s liquidity, userbase, and tooling.
      <br className="hidden lg:block" />
      There&apos;s support waiting for you!
    </p>
  ),
  cta: {
    href: "#",
    label: "CTA Link Out",
  },
};

export const Callout = () => {
  const targetRef = React.useRef(null);
  const isInView = useInView(targetRef);

  const fadeVariants = {
    hidden: { opacity: 0, y: 10, transition: { duration: 0.5 } },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };
  return (
    <motion.div
      ref={targetRef}
      className="relative z-10 container py-16 max-w-7xl mx-auto lg:py-24 xl:py-32"
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={fadeVariants}
    >
      <div className="flex flex-col gap-8 bg-secondary rounded-lg p-8 lg:flex-row lg:gap-0 lg:items-center lg:justify-between">
        <div className="space-y-4 lg:w-2/3">
          <h2 className="text-4xl font-medium">{CONTENT.heading}</h2>
          <div className="text-muted-foreground">{CONTENT.body}</div>
        </div>
        <Link href={CONTENT.cta.href} target="_blank" rel="noreferrer">
          <Button>
            {CONTENT.cta.label} <IconArrowRight size={18} className="ml-1.5" />
          </Button>
        </Link>
      </div>
    </motion.div>
  );
};
