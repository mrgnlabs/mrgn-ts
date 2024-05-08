"use client";

import React from "react";

import Lottie, { useLottie } from "lottie-react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { IconArrowRight } from "@tabler/icons-react";

import scrollIconAnimation from "~/lottie/scrollIconAnimation.json";
import heroAnimation from "~/lottie/heroAnimation.json";

import { Button } from "~/components/ui/button";
import { ScrollTo } from "~/components/ui/scroll-to";
import { IconMoneyBill, IconCode } from "~/components/ui/icons";

const CONTENT = {
  heading: "A new liquidity layer for performant DeFi",
  features: [
    {
      icon: <IconMoneyBill />,
      body: "Earn transparent yield & mint inflation protected assets",
      cta: {
        target: "products",
        label: "Start earning",
      },
    },
    {
      icon: <IconCode />,
      body: "Build something iconic with marginfi's liquidity, tooling, and users",
      cta: {
        target: "highlights",
        label: "Start building",
      },
    },
  ],
};

type HeroAnimationProps = {
  inView: boolean;
};

const HeroAnimation = ({ inView }: HeroAnimationProps) => {
  const { View, goToAndPlay, goToAndStop } = useLottie({
    animationData: heroAnimation,
    loop: false,
    autoplay: false,
  });

  React.useEffect(() => {
    if (inView) {
      goToAndPlay(0);
    } else {
      goToAndStop(0);
    }
  }, [inView, goToAndPlay, goToAndStop]);

  return View;
};

export const Hero = () => {
  const containerRef = React.useRef(null);
  const targetRef = React.useRef(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["end end", "start start"],
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const scrollIconOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const isInView = useInView(containerRef);

  return (
    <div ref={containerRef} className="h-[110vh] lg:h-[150vh]">
      <div className="w-screen min-h-screen relative flex flex-col items-center justify-center">
        <div className="container relative pt-28 pb-16 px-4 space-y-16 z-20 lg:-translate-y-4 lg:pt-16 lg:px-8">
          <h1 className="text-6xl font-medium bg-gradient-to-r from-mrgn-gold to-mrgn-chartreuse leading-none inline-block text-transparent bg-clip-text md:text-7xl lg:leading-[1.15] lg:w-2/3">
            {CONTENT.heading}
          </h1>
          <div className="flex flex-col gap-8 w-full lg:flex-row">
            {CONTENT.features.map((feature, index) => (
              <div
                key={index}
                className="w-full bg-gradient-to-r from-mrgn-gold to-mrgn-chartreuse p-[1px] rounded-xl lg:max-w-[18rem]"
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
            className="fixed bottom-10 left-1/2 w-16 z-20 -translate-x-1/2"
            style={{ opacity: scrollIconOpacity }}
          >
            <Lottie animationData={scrollIconAnimation} />
          </motion.button>
        </ScrollTo>
        <motion.div className="fixed top-0 left-0 z-0 w-screen h-screen object-cover" style={{ opacity: heroOpacity }}>
          <HeroAnimation inView={isInView} />
        </motion.div>
      </div>
    </div>
  );
};
