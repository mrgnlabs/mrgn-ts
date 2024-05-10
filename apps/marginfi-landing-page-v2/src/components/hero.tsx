"use client";

import React from "react";

import Lottie, { useLottie } from "lottie-react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { IconArrowRight } from "@tabler/icons-react";

import { useIsMobile } from "~/lib/useIsMobile";
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
  const isMobile = useIsMobile();
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["end end", `start ${isMobile ? "40%" : "20%"}`],
  });

  const containerVariants = {
    hidden: {
      transition: {
        staggerChildren: 0.25,
        staggerDirection: -1,
        delayChildren: 0.5,
      },
    },
    visible: {
      transition: {
        staggerChildren: 0.25,
        delayChildren: 0.5,
      },
    },
  };

  const fadeVariants = {
    hidden: { opacity: 0, y: 10, transition: { duration: 0.5 } },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const scrollIconOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const isInView = useInView(containerRef);

  return (
    <>
      <div ref={containerRef} className="min-h-[110vh] lg:min-h-[150vh]">
        <div className="w-screen min-h-screen relative flex flex-col items-center justify-center">
          <div className="container relative pt-28 pb-16 px-4 space-y-16 z-20  md:-translate-y-4 lg:pt-16 lg:px-8">
            <motion.h1
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              variants={fadeVariants}
              className="text-5xl font-medium bg-gradient-to-r from-mrgn-gold to-mrgn-chartreuse leading-none inline-block text-transparent bg-clip-text sm:text-[3.5rem] md:text-7xl lg:leading-[1.15] lg:w-2/3"
            >
              {CONTENT.heading}
            </motion.h1>
            <motion.div
              className="flex flex-col xs:flex-row gap-4 w-full md:gap-8"
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              variants={{ ...containerVariants }}
            >
              {CONTENT.features.map((feature, index) => (
                <motion.div
                  key={index}
                  className="bg-gradient-to-r from-mrgn-gold to-mrgn-chartreuse p-[1px] rounded-xl xs:w-1/2 lg:w-full lg:max-w-[18rem]"
                  variants={fadeVariants}
                >
                  <div
                    className="flex flex-col gap-4 items-center justify-between rounded-xl p-4 py-8 text-center h-full md:p-9"
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
                </motion.div>
              ))}
            </motion.div>
          </div>
          <ScrollTo to="stats">
            <motion.button
              ref={targetRef}
              className="fixed bottom-10 left-1/2 w-16 z-20 -translate-x-1/2 md:block"
              style={{ opacity: scrollIconOpacity }}
            >
              <Lottie animationData={scrollIconAnimation} />
            </motion.button>
          </ScrollTo>
        </div>
      </div>
      <motion.div
        className="fixed top-0 -left-[125vw] z-0 w-[250vw] lg:left-0 lg:w-screen h-screen object-cover"
        style={{ opacity: heroOpacity }}
      >
        <HeroAnimation inView={isInView} />
      </motion.div>
    </>
  );
};
