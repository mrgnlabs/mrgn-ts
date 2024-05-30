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
      body: (
        <>
          Earn transparent yield & mint
          <br className="hidden lg:block" /> inflation protected assets
        </>
      ),
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

export const Hero = () => {
  const containerRef = React.useRef(null);
  const targetRef = React.useRef(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const isMobile = useIsMobile();
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["end end", `start ${isMobile ? "40%" : "20%"}`],
  });

  const containerVariants = {
    hidden: {
      transition: {
        staggerChildren: 0.3,
        staggerDirection: -1,
      },
    },
    visible: {
      transition: {
        staggerChildren: 0.3,
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

  React.useEffect(() => {
    if (!videoRef.current) return;

    if (isInView) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  }, [isInView, videoRef]);

  return (
    <>
      <div ref={containerRef} className="min-h-[110vh] lg:min-h-[125vh]">
        <div className="w-screen min-h-screen relative flex flex-col items-center justify-center">
          <div className="container relative pt-28 pb-16 px-4 space-y-8 z-20 -translate-y-4 tall:-translate-y-20 sm:space-y-16 tallWide:-translate-y-4 lg:pt-16 md:px-8">
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
                  className="bg-gradient-to-r from-mrgn-gold/40 to-mrgn-slate/40 p-[1px] rounded-xl xs:w-1/2 md:w-full md:max-w-[20rem]"
                  variants={fadeVariants}
                >
                  <div
                    className="flex flex-col gap-4 items-center justify-between rounded-xl px-4 py-6 text-center h-full"
                    style={{
                      background: "radial-gradient(100% 100% at 50% 100%, #29363C 0%, #202628 19.73%, #0F1111 100%)",
                    }}
                  >
                    {feature.icon}
                    <div className="text-primary/80">{feature.body}</div>
                    <ScrollTo to={feature.cta.target}>
                      <Button className="mt-2">
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
              className="fixed bottom-10 left-1/2 w-16 z-20 -translate-x-1/2 hidden tall:flex"
              style={{ opacity: scrollIconOpacity }}
            >
              <Lottie animationData={scrollIconAnimation} />
            </motion.button>
          </ScrollTo>
        </div>
      </div>
      <motion.video
        ref={videoRef}
        className="fixed top-0 z-0 md:-left-[100vw] md:w-[200vw] lg:left-0 lg:w-screen h-screen object-cover"
        autoPlay={false}
        loop={false}
        muted
        playsInline
        style={{ opacity: heroOpacity }}
      >
        <source src="https://storage.googleapis.com/mrgn-public/videos/hero.mp4" type="video/mp4" />
      </motion.video>
    </>
  );
};
