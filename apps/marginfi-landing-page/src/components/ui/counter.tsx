"use client";

import React from "react";

import { useInView, useMotionValue, useSpring } from "framer-motion";
import millify from "millify";

const Counter = ({ value, direction = "up" }: { value: number; direction?: "up" | "down" }) => {
  const ref = React.useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(direction === "down" ? value : 0);
  const springValue = useSpring(motionValue, {
    damping: 50,
    stiffness: 100,
  });
  const isInView = useInView(ref);

  React.useEffect(() => {
    if (isInView) {
      motionValue.set(direction === "down" ? 0 : value);
    } else {
      motionValue.set(0);
    }
  }, [motionValue, isInView, value, direction]);

  React.useEffect(
    () =>
      springValue.on("change", (latest) => {
        if (ref.current) {
          ref.current.textContent = millify(latest, {
            precision: 0,
          });
        }
      }),
    [springValue]
  );

  return <span ref={ref} />;
};

export { Counter };
