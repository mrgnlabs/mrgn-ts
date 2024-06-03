"use client";

import React from "react";

import { useLottie } from "lottie-react";
import { useInView } from "framer-motion";
import { millify } from "millify";

import { useProtocolStats } from "~/lib/useProtocolStats";
import wavesAnimation from "~/lottie/wavesAnimation.json";

type WavesProps = {
  inView: boolean;
};

const Waves = ({ inView }: WavesProps) => {
  const { View, goToAndPlay, goToAndStop } = useLottie({
    animationData: wavesAnimation,
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

export const Highlights = () => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef);
  const { liquidity } = useProtocolStats();

  const CONTENT = React.useMemo(() => {
    const content: {
      subHeading: string;
      highlights: string[];
    } = {
      subHeading: "Plug directly into...",
      highlights: [],
    };
    if (!liquidity) return content;
    content.highlights = [
      `$${millify(liquidity)} of liquidity`,
      "Access over 450,000 users",
      "A host of supporting off-chain tooling",
    ];

    return content;
  }, [liquidity]);

  return (
    <div ref={containerRef} className="relative z-10 w-full" id="highlights">
      <div className="relative container max-w-7xl flex flex-col gap-16 pt-40 pb-16 z-20 lg:pt-32 lg:gap-4 lg:flex-row lg:justify-between lg:items-center lg:h-[75vh]">
        <h2 className="text-6xl font-medium lg:w-1/2 lg:text-8xl">
          If you&apos;re a developer,{" "}
          <span className="bg-gradient-to-r from-mrgn-gold to-mrgn-chartreuse text-transparent bg-clip-text">
            there&apos;s more
          </span>
        </h2>
        <div className="space-y-2">
          <p className="text-muted-foreground text-lg">{CONTENT.subHeading}</p>
          <ul className="text-primary text-xl space-y-1.5">
            {CONTENT.highlights.map((highlight, index) => (
              <li key={index}>{highlight}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="absolute top-0 left-0 w-full h-full -translate-y-4 lg:-translate-y-1/2">
        <Waves inView={isInView} />
      </div>
    </div>
  );
};
