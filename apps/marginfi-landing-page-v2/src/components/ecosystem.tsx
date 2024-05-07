"use client";

import React from "react";

import Link from "next/link";

import { IconArrowRight } from "@tabler/icons-react";
import { motion, useScroll, useTransform } from "framer-motion";

import { Button } from "~/components/ui/button";

export const Ecosystem = () => {
  const targetRef = React.useRef(null);
  const { scrollYProgress: fadeInAnimationProgress } = useScroll({
    target: targetRef,
    offset: ["50% end", "end start"],
  });

  const blobOpacityFadeIn = useTransform(fadeInAnimationProgress, [0, 1], [0, 0.8]);

  return (
    <div
      ref={targetRef}
      className="relative z-10 container max-w-7xl flex items-center justify-between gap-8 py-24"
      id="ecosystem"
    >
      <div className="h-[400px] w-3/5 bg-secondary" />
      <div className="space-y-6 max-w-sm relative z-10">
        <h3 className="text-4xl font-medium">A full ecosystem powered by marginfi SDK</h3>
        <p className="text-muted-foreground">
          We&apos;re always working to push new products on top of our protocol, and so is our community.
        </p>
        <Link className="inline-block" href="https://app.marginfi.com/ecosystem">
          <Button>
            View Ecosystem <IconArrowRight size={18} className="ml-1.5" />
          </Button>
        </Link>
      </div>

      <motion.svg
        className="fixed z-0 bottom-0 left-1/2 -translate-x-1/2"
        width="1251"
        height="785"
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
    </div>
  );
};
