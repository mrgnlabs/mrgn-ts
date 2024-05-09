"use client";

import React from "react";
import { motion, useInView } from "framer-motion";
import { useDebounce } from "@uidotdev/usehooks";
import { IconArrowRight } from "@tabler/icons-react";

import Link from "next/link";
import Image from "next/image";

import random from "lodash/random";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";

const CONTENT = {
  heading: "Getting started with marginfi",
  articles: [
    {
      url: "https://app.marginfi.com/",
      image: `https://picsum.photos/1920/1080?random=${random(1, 10000)}`,
      title: "Sit consectetur tempor fugiat duis",
      description: "Esse ea labore officia commodo do pariatur ex adipisicing sint et veniam exercitation",
    },
    {
      url: "https://app.marginfi.com/",
      image: `https://picsum.photos/1920/1080?random=${random(1, 10000)}`,
      title: "Velit culpa qui sint aute aliqua mollit",
      description: "Esse ea labore officia commodo do pariatur ex adipisicing sint et veniam exercitation",
    },
    {
      url: "https://app.marginfi.com/",
      image: `https://picsum.photos/1920/1080?random=${random(1, 10000)}`,
      title: "Laborum deserunt excepteur sint ut ex ut",
      description: "Esse ea labore officia commodo do pariatur ex adipisicing sint et veniam exercitation",
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
    visible: { opacity: 0.8, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <div ref={targetRef} className="relative z-10 container max-w-7xl py-16 flex flex-col items-center gap-12 lg:py-24">
      <h2 className="text-5xl font-medium">{CONTENT.heading}</h2>
      <motion.section
        className="grid gap-6 lg:grid-cols-3"
        animate={debouncedIsInView ? "visible" : "hidden"}
        variants={containerVariants}
      >
        {CONTENT.articles.map((article, index) => (
          <motion.article variants={fadeVariants} key={index}>
            <Link href={article.url} className="group" target="_blank" rel="noreferrer">
              <Card className="relative z-10 w-full bg-secondary h-full flex flex-col justify-start rounded-lg p-0 transition-transform duration-300 group-hover:scale-[1.025]">
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
