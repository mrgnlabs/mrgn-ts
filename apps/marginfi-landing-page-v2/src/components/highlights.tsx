"use client";

import React from "react";

import Lottie from "lottie-react";
import { useInView } from "framer-motion";
import wavesAnimation from "~/lottie/wavesAnimation.json";

const CONTENT = {
  subHeading: "Plug directly into...",
  highlights: ["$500M of liquidity", "Access over 200,000 users", "A host of supporting on and off-chain systems"],
};

export const Highlights = () => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const lottieRef = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true });

  return (
    <div ref={containerRef} className="relative">
      <div className="relative h-[75vh] container max-w-7xl flex justify-between items-center py-24 z-20">
        <h2 className="text-8xl font-medium w-1/2">
          If you&apos;re a developer,{" "}
          <span className="bg-gradient-to-r from-mrgn-gold to-mrgn-chartreuse text-transparent bg-clip-text">
            there&apos;s more
          </span>
        </h2>
        <div className="space-y-2">
          <p className="text-muted-foreground">{CONTENT.subHeading}</p>
          <ul className="text-primary text-lg space-y-1">
            {CONTENT.highlights.map((highlight) => (
              <li>{highlight}</li>
            ))}
          </ul>
        </div>
      </div>
      <Lottie
        ref={lottieRef}
        animationData={wavesAnimation}
        className="absolute bottom-0 left-0 z-0 w-screen h-screen object-cover"
      />
    </div>
  );
};
