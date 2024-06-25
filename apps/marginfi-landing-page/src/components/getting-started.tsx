"use client";

import React from "react";
import { motion, useInView } from "framer-motion";
import { useDebounce } from "@uidotdev/usehooks";
import { IconArrowRight } from "@tabler/icons-react";

import Link from "next/link";
import Image from "next/image";

import random from "lodash/random";

import { Card, CardContent, CardFooter } from "~/components/ui/card";

const CONTENT = {
  heading: "Getting started with marginfi",
  articles: [
    {
      url: "https://mrgn.substack.com/p/introducing-ybx",
      image: `/images/articles/ybx-introducing.jpg`,
      title: "Introducing $YBX",
      description: "Solana's inflation protected, decentralized stable-asset",
    },
    {
      url: "https://docs.marginfi.com/ybx",
      image: `/images/articles/ybx-whitepaper.jpg`,
      title: "$YBX v1 - Whitepaper",
      description: "A stable-asset to capture blockchain monetary policy",
    },
    {
      url: "https://medium.com/marginfi/exploring-mrgnlend-a-guide-to-decentralized-lending-and-borrowing-1e05a422a505",
      image: "/images/articles/mrgnlend-explore.jpg",
      title: "Exploring mrgnlend",
      description: "A guide to decentralized lending and borrowing on marginfi",
    },
  ],
};

export const GettingStarted = () => {
  const targetRef = React.useRef(null);
  const isInView = useInView(targetRef);
  const debouncedIsInView = useDebounce(isInView, 500);

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

  const fadeVariants = {
    hidden: { opacity: 0, y: 10, transition: { duration: 0.5 } },
    visible: { opacity: 0.8, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <div
      ref={targetRef}
      className="relative z-10 container max-w-7xl py-16 flex flex-col items-center gap-12 lg:py-24 xl:py-32"
    >
      <h2 className="text-4xl max-w-5xl mx-auto w-full font-medium text-center lg:text-5xl">{CONTENT.heading}</h2>
      <motion.section
        className="grid gap-6 lg:grid-cols-3"
        animate={debouncedIsInView ? "visible" : "hidden"}
        variants={containerVariants}
      >
        {CONTENT.articles.map((article, index) => (
          <motion.article variants={fadeVariants} key={index}>
            <Link href={article.url} className="group" target="_blank" rel="noreferrer">
              <Card className="relative z-10 w-full max-w-sm mx-auto bg-secondary h-full flex flex-col justify-start rounded-lg p-0 transition-transform duration-300 group-hover:scale-[1.025] lg:max-w-none">
                <CardContent className="p-0 pb-4 space-y-4">
                  <div className="w-full h-40 bg-mrgn-gold relative rounded-t-lg">
                    <Image src={article.image} alt={article.title} fill={true} className="object-cover rounded-t-lg" />
                  </div>
                  <div className="py-2 px-4 space-y-2">
                    <h3 className="text-lg font-medium">{article.title}</h3>
                    <p className="text-muted-foreground">{article.description}</p>
                  </div>
                </CardContent>
                <CardFooter>
                  <button className="flex items-center gap-2 transition-colors group-hover:text-mrgn-chartreuse">
                    Read article <IconArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                  </button>
                </CardFooter>
              </Card>
            </Link>
          </motion.article>
        ))}
      </motion.section>
    </div>
  );
};
