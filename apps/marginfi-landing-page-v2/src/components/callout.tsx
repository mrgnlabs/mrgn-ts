"use client";

import React from "react";

import { IconArrowRight } from "@tabler/icons-react";
import { motion, useInView } from "framer-motion";

import { Button } from "~/components/ui/button";
import { Logo } from "~/components/ui/logo";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";

const CONTENT = {
  heading: "Grant Gateway: Fueling the mrgn. ecosystem",
  body: (
    <p>
      Create a grant proposal to build something iconic with marginfi&apos;s liquidity,
      <br className="hidden lg:block" />
      userbase, and tooling. <strong className="text-primary">There&apos;s support waiting for you!</strong>
    </p>
  ),
  cta: {
    label: "Get in touch",
  },
};

export const Callout = () => {
  const targetRef = React.useRef(null);
  const isInView = useInView(targetRef);

  const fadeVariants = {
    hidden: { opacity: 0, y: 10, transition: { duration: 0.5 } },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };
  return (
    <motion.div
      ref={targetRef}
      className="relative z-10 container py-16 max-w-7xl mx-auto lg:py-24"
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={fadeVariants}
    >
      <div className="flex flex-col gap-8 bg-secondary rounded-lg p-8 lg:flex-row lg:gap-0 lg:items-center lg:justify-between">
        <div className="space-y-4 lg:w-2/3">
          <h2 className="text-4xl font-medium">{CONTENT.heading}</h2>
          <div className="text-muted-foreground text-lg">{CONTENT.body}</div>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              {CONTENT.cta.label} <IconArrowRight size={18} className="ml-1.5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl px-8 outline-none">
            <DialogHeader className="sm:text-center gap-3 items-center">
              <Logo size={44} wordmark={false} />
              <DialogTitle className="text-3xl leading-none tracking-normal">
                Grant Gateway
                <br /> <span className="text-xl">Fueling the mrgn. ecosystem</span>
              </DialogTitle>
              <DialogDescription className="w-[60%] mx-auto">
                Create a grant proposal to build something iconic with marginfi&apos;s liquidity, userbase, and tooling.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <div className="grid gap-4 py-4">
                <h3 className="font-medium text-lg">Your info</h3>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" className="col-span-3" placeholder="Your name" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" className="col-span-3" placeholder="example@example.com" />
                </div>
              </div>
              <div className="grid gap-4 py-4">
                <h3 className="font-medium text-lg">Project info</h3>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="projectName">Name</Label>
                  <Input id="projectName" className="col-span-3" placeholder="Project name" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="projectUrl">URL</Label>
                  <Input id="projectUrl" type="url" className="col-span-3" placeholder="https://www.yourwebsite.com/" />
                </div>
                <div className="grid grid-cols-4 gap-4 items-start">
                  <Label htmlFor="projectDesc" className="mt-2">
                    Description
                  </Label>
                  <Textarea
                    id="projectDesc"
                    className="col-span-3"
                    rows={4}
                    placeholder="Tell us about your project..."
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Save changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </motion.div>
  );
};
