"use client";

import React from "react";

import Image from "next/image";

import { motion, useInView } from "framer-motion";

const CONTENT = {
  heading: <>Here&apos;s more of what we&apos;re building</>,
  features: [
    {
      heading: "The first Liquidity Layer with MEV-optimized settlement",
      body: (
        <>
          <p>
            marginfi is building MEV-optimized bundling across liquidations, swaps, and flashloans to protect users &
            secure value.
          </p>
          <p className="text-primary">Join us as we advance our MEV initiatives!</p>
        </>
      ),
    },
    {
      heading: "The first Liquidity Layer with enshrined, liquid primitives",
      body: (
        <>
          <p className="text-primary">All developers can build on:</p>
          <ul className="list-disc space-y-2 ml-4 text-sm">
            <li>
              <strong className="font-medium">mrgnlend</strong>: one of crypto&apos;s most used lend/borrow venues
            </li>
            <li>
              <strong className="font-medium">LST</strong>: solana&apos;s highest yielding liquid staking SOL token
            </li>
            <li>
              <strong className="font-medium">YBX</strong>: solana&apos;s decentralized, yield accruing stable-asset
            </li>
            <li>
              <strong className="font-medium">mrgnswap</strong>: crypto&apos;s exciting new integrated stableswap
            </li>
          </ul>
        </>
      ),
    },
    {
      heading: "The first Liquidity Layer without fragmentation",
      body: (
        <>
          <p>
            marginfi is directly integrated with the Solana blockchain. Developers and users have atomic composability
            with any other Solana-based application.
          </p>
        </>
      ),
    },
  ],
};

export const Features = () => {
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
    <div ref={targetRef} className="relative container space-y-24 py-16 z-20 lg:py-24 xl:py-32" id="features">
      <h2 className="text-4xl max-w-5xl mx-auto w-full font-medium text-center lg:text-5xl">{CONTENT.heading}</h2>
      <motion.div
        className="flex flex-col gap-12 max-w-3xl mx-auto w-full lg:gap-6"
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={containerVariants}
      >
        {CONTENT.features.map((feature, index) => (
          <motion.div
            className="flex flex-col w-full max-w-sm mx-auto bg-secondary rounded-lg lg:flex-row lg:max-w-none"
            key={index}
            variants={fadeVariants}
          >
            <div
              className="h-[200px] w-full p-8 flex items-center justify-center rounded-t-lg shrink-0 lg:w-[240px] lg:h-[240px] lg:rounded-tr-none lg:rounded-bl-lg"
              style={{ background: "radial-gradient(100% 100% at 0% 100%, #42535A 0%, #2B3539 19.73%, #0F1111 100%)" }}
            >
              <div className="relative h-full w-[160px]">
                <Image src={`/illustrations/${index + 1}.svg`} alt={feature.heading} fill={true} />
              </div>
            </div>
            <div className="flex flex-col justify-center p-6 space-y-3">
              <h3 className="text-lg text-secondary-foreground font-medium">{feature.heading}</h3>
              <div className="text-muted-foreground space-y-4">{feature.body}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};
