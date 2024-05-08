"use client";

import React from "react";

import Image from "next/image";
import Link from "next/link";

import { motion, useInView } from "framer-motion";
import { IconBrandX } from "@tabler/icons-react";

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
};

export const Investors = () => {
  const targetRef = React.useRef(null);
  const isInView = useInView(targetRef);

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
      className="relative z-10 container max-w-7xl flex flex-col gap-16 justify-center items-center text-center py-16 lg:py-24"
    >
      <header className="space-y-8">
        <h2 className="text-4xl font-medium lg:text-5xl">{CONTENT.heading}</h2>
        <h3 className="text-2xl font-medium lg:text-3xl">{CONTENT.body}</h3>
      </header>
      <motion.ul
        className="grid grid-cols-2 gap-1.5 w-full lg:grid-cols-4"
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={containerVariants}
      >
        {CONTENT.angels.map((angel, index) => {
          const twitter = `https://twitter.com/${angel.twitter}`;
          return (
            <motion.li
              key={index}
              className="bg-secondary h-[120px] rounded-md py-4 px-6 flex items-center justify-center"
              variants={fadeVariants}
            >
              <div className="flex gap-2 justify-between items-center w-full">
                <Link href={twitter} target="_blank" rel="noreferrer">
                  <Image src={angel.image} alt={angel.name} width={48} height={48} className="rounded-full" />
                </Link>
                <div className="text-left leading-none -translate-y-0.5">
                  <h4 className="text-lg font-medium">{angel.name}</h4>
                  <h5 className="text-muted-foreground">@{angel.twitter}</h5>
                </div>
                <Link href={twitter} target="_blank" rel="noreferrer" className="ml-auto">
                  <IconBrandX size={24} />
                </Link>
              </div>
            </motion.li>
          );
        })}
      </motion.ul>
    </div>
  );
};
