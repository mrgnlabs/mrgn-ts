"use client";

import React from "react";

import Lottie from "lottie-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { IconArrowRight } from "@tabler/icons-react";

import scrollIconAnimation from "~/lottie/scrollIconAnimation.json";
import heroAnimation from "~/lottie/heroAnimation.json";

import { Button } from "~/components/ui/button";
import { ScrollTo } from "~/components/ui/scroll-to";

const CONTENT = {
  heading: "A new liquidity layer for performant DeFi",
  features: [
    {
      icon: (
        <svg width="28" viewBox="0 0 28 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M27.5 5C25.0146 5 23 2.98527 23 0.5M0.5 5C2.98527 5 5 2.98527 5 0.5M27.5 11C25.0146 11 23 13.0146 23 15.5M0.5 11C2.98527 11 5 13.0146 5 15.5M3.5 0.5H24.5C26.1569 0.5 27.5 1.84314 27.5 3.5V12.5C27.5 14.1569 26.1569 15.5 24.5 15.5H3.5C1.84314 15.5 0.5 14.1569 0.5 12.5V3.5C0.5 1.84314 1.84314 0.5 3.5 0.5ZM17 8C17 9.6569 15.6569 11 14 11C12.3431 11 11 9.6569 11 8C11 6.3431 12.3431 5 14 5C15.6569 5 17 6.3431 17 8Z"
            stroke="white"
            stroke-linecap="round"
          />
        </svg>
      ),
      body: "I'm here to maximize my potential in DeFi",
      cta: {
        target: "products",
        label: "Start earning",
      },
    },
    {
      icon: (
        <svg width="28" viewBox="0 0 30 22" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M6.74978 5L1.81017 9.94205C1.22453 10.5279 1.22477 11.4778 1.8107 12.0634L6.74978 17M23.2499 5L28.1894 9.94205C28.775 10.5279 28.7748 11.4778 28.1889 12.0634L23.2499 17M19.5 0.5L10.5 21.5"
            stroke="white"
            stroke-linecap="round"
          />
        </svg>
      ),
      body: "I'm a developer and I want to power my dApp with marginfi",
      cta: {
        target: "features",
        label: "Start building",
      },
    },
  ],
};

export const Hero = () => {
  const targetRef = React.useRef(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["end end", "start start"],
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const scrollIconOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);

  return (
    <div className="h-[150vh]">
      <div className="w-screen h-screen relative flex flex-col items-center justify-center">
        <div className="container relative py-16 px-4 space-y-16 z-20 -translate-y-4">
          <h1 className="text-6xl font-medium bg-gradient-to-r from-mrgn-gold to-mrgn-chartreuse leading-none inline-block text-transparent bg-clip-text md:text-7xl lg:leading-[1.15] lg:w-2/3">
            {CONTENT.heading}
          </h1>
          <div className="flex gap-8 w-full">
            {CONTENT.features.map((feature, index) => (
              <div
                key={index}
                className="w-full max-w-[18rem] bg-gradient-to-r from-mrgn-gold to-mrgn-chartreuse p-[1px] rounded-xl"
              >
                <div
                  className="flex flex-col gap-4 items-center justify-between rounded-xl p-9 text-center h-full"
                  style={{
                    background: "radial-gradient(100% 100% at 50% 100%, #42535A 0%, #2B3539 19.73%, #0F1111 100%)",
                  }}
                >
                  {feature.icon}
                  {feature.body}
                  <ScrollTo to={feature.cta.target}>
                    <Button>
                      {feature.cta.label}
                      <IconArrowRight size={18} className="ml-1.5" />
                    </Button>
                  </ScrollTo>
                </div>
              </div>
            ))}
          </div>
        </div>
        <ScrollTo to="stats">
          <motion.button
            ref={targetRef}
            className="fixed bottom-10 left-1/2 w-16 z-10 -translate-x-1/2"
            style={{ opacity: scrollIconOpacity }}
          >
            <Lottie animationData={scrollIconAnimation} />
          </motion.button>
        </ScrollTo>
        <motion.div className="fixed top-0 left-0 z-0 w-screen h-screen object-cover" style={{ opacity: heroOpacity }}>
          <Lottie animationData={heroAnimation} loop={false} />
        </motion.div>
      </div>
    </div>
  );
};
