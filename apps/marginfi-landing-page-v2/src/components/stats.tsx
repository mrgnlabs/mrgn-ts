"use client";

import React from "react";

import { motion, useScroll, useTransform, useInView } from "framer-motion";

import { cn } from "~/lib/utils";

import { Counter } from "~/components/ui/counter";
import { useIsMobile } from "~/lib/useIsMobile";

const CONTENT = {
  heading:
    "A liquidity layer built for finance. Access native yield, embedded risk systems, and off-chain data plug-ins",
  stats: [
    {
      kpi: "Total Yield Generated",
      value: 37.02,
    },
    {
      kpi: "Total Liquidity",
      value: 450,
    },
    {
      kpi: "Total Volume",
      value: 300,
    },
  ],
};

export const Stats = () => {
  const isMobile = useIsMobile();
  const targetRef = React.useRef(null);
  const { scrollYProgress: fadeInAnimationProgress } = useScroll({
    target: targetRef,
    offset: ["-25% end", "50% start"],
  });
  const { scrollYProgress: fadeOutAnimationProgress } = useScroll({
    target: targetRef,
    offset: ["50% start", "200% start"],
  });

  const blobOpacityFadeIn = useTransform(fadeInAnimationProgress, [0, 1], [0, 0.8]);
  const blobOpacityFadeOut = useTransform(fadeOutAnimationProgress, [0, 1], [1, 0]);

  const isInView = useInView(targetRef, {
    amount: !isMobile ? 0.9 : undefined,
  });

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
    <>
      <div ref={targetRef} className="relative z-20 text-center space-y-24 py-16 lg:py-24" id="stats">
        <h2 className="text-4xl font-medium max-w-4xl mx-auto w-full px-4 lg:text-5xl">{CONTENT.heading}</h2>
        <div className="w-full">
          <div className="h-[1px] bg-muted-foreground/50" />
          <motion.ul
            className="max-w-7xl mx-auto w-full lg:grid lg:grid-cols-3"
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            variants={containerVariants}
          >
            {CONTENT.stats.map((stat, index) => (
              <motion.li
                key={index}
                className={cn(
                  "border border-muted-foreground/50 border-l-0 border-r-0 lg:border lg:border-t-0 lg:border-b-0",
                  index < CONTENT.stats.length && "lg:border-l-0",
                  index === CONTENT.stats.length - 1 && "lg:border-r-0"
                )}
                variants={fadeVariants}
              >
                <dl className="py-8 space-y-4 lg:space-y-8 lg:py-20">
                  <dt className="text-muted-foreground">{stat.kpi}</dt>
                  <dd className="flex items-center justify-center gap-1 text-6xl font-medium">
                    <span className="text-4xl">$</span>
                    <Counter value={stat.value} />m
                  </dd>
                </dl>
              </motion.li>
            ))}
          </motion.ul>
          <div className="h-[1px] bg-muted-foreground/50" />
        </div>
      </div>
      <motion.div className="fixed z-0 bottom-0 left-1/2 -translate-x-1/2" style={{ opacity: blobOpacityFadeOut }}>
        <motion.svg
          width="1251"
          viewBox="0 0 1251 785"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ opacity: blobOpacityFadeIn }}
        >
          <g filter="url(#filter0_f_48_3597)">
            <path
              d="M992 526.5C992 455.555 953.387 387.515 884.655 337.349C815.923 287.183 722.702 259 625.5 259C528.298 259 435.077 287.183 366.345 337.349C297.613 387.515 259 455.555 259 526.5L625.5 526.5H992Z"
              fill="url(#paint0_linear_48_3597)"
            />
          </g>
          <defs>
            <filter
              id="filter0_f_48_3597"
              x="0.899994"
              y="0.899994"
              width="1249.2"
              height="783.7"
              filterUnits="userSpaceOnUse"
              colorInterpolationFilters="sRGB"
            >
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
              <feGaussianBlur stdDeviation="129.05" result="effect1_foregroundBlur_48_3597" />
            </filter>
            <linearGradient
              id="paint0_linear_48_3597"
              x1="410.949"
              y1="513"
              x2="821.811"
              y2="515.955"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#B8AC9D" />
              <stop offset="0.5" stopColor="#52534E" />
              <stop offset="1" stopColor="#DEE873" />
            </linearGradient>
          </defs>
        </motion.svg>
      </motion.div>
    </>
  );
};
