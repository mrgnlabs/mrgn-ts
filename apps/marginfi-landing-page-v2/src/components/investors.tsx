"use client";

import React from "react";
import { motion, useInView } from "framer-motion";

const CONTENT = {
  heading: "mrgn is a team focused on democratizing essential financial infrastructure for the betterment of mankind.",
  body: (
    <>
      and we&apos;ve raised <strong className="text-mrgn-chartreuse">$8M lifetime</strong> to make this happen.
    </>
  ),
};

export const Investors = () => {
  const targetRef = React.useRef(null);
  const isInView = useInView(targetRef);

  const containerVariants = {
    hidden: {
      transition: {
        staggerChildren: 0.15,
        staggerDirection: -1,
      },
    },
    visible: {
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const fadeVariants = {
    hidden: { opacity: 0, y: 10, transition: { duration: 0.5 } },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <div
      ref={targetRef}
      className="relative z-10 container max-w-7xl flex flex-col gap-16 justify-center items-center text-center py-24"
    >
      <header className="space-y-8">
        <h2 className="text-5xl font-medium">{CONTENT.heading}</h2>
        <h3 className="text-3xl font-medium">{CONTENT.body}</h3>
      </header>
      <motion.ul
        className="grid grid-cols-4 gap-1.5 w-full"
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={containerVariants}
      >
        {[...new Array(8)].map((_, index) => (
          <motion.li key={index} className="bg-secondary h-[120px] rounded-md" variants={fadeVariants} />
        ))}
      </motion.ul>
    </div>
  );
};
