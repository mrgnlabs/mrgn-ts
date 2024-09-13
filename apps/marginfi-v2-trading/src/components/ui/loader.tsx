import React from "react";
import { cn } from "~/utils";
import { motion, Variants, AnimatePresence } from "framer-motion";

type LoaderProps = {
  label?: string;
  className?: string;
  iconSize?: number;
};

const paths = [
  // Left column (top to bottom)
  "M32 142C32 104.445 62.4446 74 100 74C137.555 74 168 104.445 168 142V238H32V142Z",
  "M32 338C32 300.445 62.4446 270 100 270C137.555 270 168 300.445 168 338V434H32V338Z",
  "M32 534C32 496.445 62.4446 466 100 466C137.555 466 168 496.445 168 534V630H32V534Z",

  // Middle column (top to bottom)
  "M200 142C200 104.445 230.445 74 268 74C305.555 74 336 104.445 336 142V238H200V142Z",
  "M200 338C200 300.445 230.445 270 268 270C305.555 270 336 300.445 336 338V434H200V338Z",
  "M200 534C200 496.445 230.445 466 268 466C305.555 466 336 496.445 336 534V630H200V534Z",

  // Right column (top to bottom)
  "M368 338C368 300.445 398.445 270 436 270C473.555 270 504 300.445 504 338V434H368V338Z",
  "M368 534C368 496.445 398.445 466 436 466C473.555 466 504 496.445 504 534V630H368V534Z",
  "M536 534C536 496.445 566.445 466 604 466C641.555 466 672 496.445 672 534V630H536V534Z",
];

export function Loader({ label = "Loading...", className, iconSize = 32 }: LoaderProps) {
  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible((prev) => !prev);
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1,
      },
    },
    exit: {
      transition: {
        staggerChildren: 0.1,
        staggerDirection: -0.5,
        when: "afterChildren",
      },
    },
  };

  const pathVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.5,
      },
    },
    exit: {
      opacity: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 text-muted-foreground", className)}>
      <motion.svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 704 704"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="704" height="704" fill="transparent" />
        <AnimatePresence mode="wait">
          {isVisible && (
            <motion.g key="paths" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
              {paths.map((d, index) => (
                <motion.path key={index} d={d} fill="black" variants={pathVariants} />
              ))}
            </motion.g>
          )}
        </AnimatePresence>
      </motion.svg>

      <p>{label}</p>
    </div>
  );
}
