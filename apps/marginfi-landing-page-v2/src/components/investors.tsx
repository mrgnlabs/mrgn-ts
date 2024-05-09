"use client";

import React from "react";

import Image from "next/image";
import Link from "next/link";

import { motion, useInView } from "framer-motion";
import { IconBrandX } from "@tabler/icons-react";

import { useIsMobile } from "~/lib/useIsMobile";

const CONTENT = {
  heading: "mrgn is a team focused on democratizing essential financial infrastructure for the betterment of mankind.",
  body: (
    <>
      and we&apos;ve raised <strong className="text-mrgn-chartreuse">$8M lifetime</strong> to make this happen.
    </>
  ),
  angels: [
    {
      twitter: "santiagoroel",
      name: "Santiago R Santos",
      image: "/images/investors/santiagoroel.jpg",
    },
    {
      twitter: "Evan_ss6",
      name: "Evanss6",
      image: "/images/investors/evan_ss6.jpg",
    },
    {
      twitter: "SplitCapital",
      name: "Zaheer",
      image: "/images/investors/splitcapital.jpg",
    },
    {
      twitter: "tarunchitra",
      name: "Tarun Chitra",
      image: "/images/investors/tarunchitra.jpg",
    },
  ],
  investors: [
    {
      link: "https://panteracapital.com/firm/",
      name: "Pantera Capital",
      image: "/images/investors/pantera.jpg",
    },
    {
      link: "https://multicoin.capital/",
      name: "Multicoin Capital",
      image: "/images/investors/multicoin.jpg",
    },
    {
      link: "https://www.anagram.xyz/",
      name: "Anagram",
      image: "/images/investors/anagram.jpg",
    },
    {
      link: "https://solana.ventures/",
      name: "Solana Ventures",
      image: "/images/investors/solanaventures.png",
    },
  ],
};

export const Investors = () => {
  const targetRef = React.useRef(null);
  const isInView = useInView(targetRef, {
    amount: 0.7,
  });

  const isMobile = useIsMobile();

  const containerVariants = {
    hidden: {
      transition: {
        staggerChildren: 0.15,
        staggerDirection: -1,
      },
    },
    visible: {
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const fadeVariants = {
    hidden: { opacity: 0, y: 10, transition: { duration: 0.5 } },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <div
      ref={targetRef}
      className="relative z-10 container max-w-8xl flex flex-col gap-16 justify-center items-center text-center py-16 lg:py-24"
    >
      <header className="space-y-12">
        <h2 className="text-4xl font-medium lg:text-5xl">{CONTENT.heading}</h2>
        <h3 className="text-2xl font-medium lg:text-3xl">{CONTENT.body}</h3>
      </header>
      <div className="space-y-4 w-full">
        <motion.p
          className="font-medium text-xl"
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={fadeVariants}
        >
          From our angels
        </motion.p>
        <motion.ul
          className="grid grid-cols-2 gap-1.5 w-full xl:grid-cols-4"
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={{ ...containerVariants }}
        >
          {CONTENT.angels.map((angel, index) => {
            const twitter = `https://twitter.com/${angel.twitter}`;
            return (
              <motion.li
                key={index}
                className="bg-secondary rounded-md flex items-center justify-center"
                variants={fadeVariants}
              >
                <Link
                  href={twitter}
                  className="flex gap-4 h-[120px] py-4 px-6 justify-between items-center w-full"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Image src={angel.image} alt={angel.name} width={48} height={48} className="rounded-full" />
                  <div className="text-left leading-none space-y-0.5">
                    <h4 className="font-medium">{angel.name}</h4>
                    <h5 className="text-sm text-muted-foreground">@{angel.twitter}</h5>
                  </div>
                  <IconBrandX size={24} className="ml-auto" />
                </Link>
              </motion.li>
            );
          })}
        </motion.ul>
      </div>
      <div className="space-y-4 w-full">
        <motion.p
          className="font-medium text-xl"
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={fadeVariants}
        >
          and investors
        </motion.p>
        <motion.ul
          className="grid grid-cols-2 gap-1.5 w-full xl:grid-cols-4"
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={containerVariants}
        >
          {CONTENT.investors.map((investor, index) => {
            return (
              <motion.li
                key={index}
                className="bg-secondary rounded-md flex items-center justify-start"
                variants={fadeVariants}
              >
                <Link
                  href={investor.link}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center h-[120px] py-4 px-6 gap-4 w-full text-left"
                >
                  <Image
                    src={investor.image}
                    alt={investor.name}
                    width={isMobile ? 48 : 64}
                    height={isMobile ? 48 : 64}
                    className="rounded-full"
                  />
                  <h4 className="lg:text-lg font-medium">{investor.name}</h4>
                </Link>
              </motion.li>
            );
          })}
        </motion.ul>
      </div>
    </div>
  );
};
