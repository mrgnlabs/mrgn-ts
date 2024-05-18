"use client";

import React from "react";

import { IconArrowRight } from "@tabler/icons-react";
import { motion, useInView } from "framer-motion";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "~/components/ui/button";
import { Logo } from "~/components/ui/logo";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "~/components/ui/form";
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

const formSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  projectName: z.string(),
  projectLink: z.string().url(),
  projectDesc: z.string(),
});

export const Callout = () => {
  const targetRef = React.useRef(null);
  const isInView = useInView(targetRef);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  // TODO: Post to ConvertKit
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    console.log(values);
  };

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
          <DialogContent className="max-w-none lg:max-w-3xl lg:py-10 lg:px-16 outline-none">
            <DialogHeader className="sm:text-center gap-2 items-center">
              <Logo size={44} wordmark={false} />
              <DialogTitle className="text-3xl leading-7 tracking-normal">
                Grant Gateway
                <br /> <span className="text-xl">Fueling the mrgn. ecosystem</span>
              </DialogTitle>
              <DialogDescription>Create a grant proposal and build something iconic with marginfi.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form className="space-y-2 mt-4" onSubmit={form.handleSubmit(onSubmit)}>
                <div className="grid md:grid-cols-2 md:gap-8">
                  <div className="space-y-4 py-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel htmlFor="name">Your Name</FormLabel>
                          <FormControl>
                            <Input id="name" className="col-span-3" placeholder="Your name" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="projectName"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel htmlFor="projectName">Project Name</FormLabel>
                          <FormControl>
                            <Input id="projectName" className="col-span-3" placeholder="Project Name" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="space-y-4 py-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel htmlFor="email">Your Email</FormLabel>
                          <FormControl>
                            <Input
                              id="email"
                              type="email"
                              className="col-span-3"
                              placeholder="example@example.com"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="projectLink"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel htmlFor="projectLink">Project Link</FormLabel>
                          <FormControl>
                            <Input
                              id="projectLink"
                              type="url"
                              className="col-span-3"
                              placeholder="https://www.yourwebsite.com/"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <FormField
                  control={form.control}
                  name="projectDesc"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel htmlFor="projectDesc">Project Description</FormLabel>
                      <FormControl>
                        <Textarea
                          id="projectDesc"
                          className="col-span-3"
                          rows={4}
                          placeholder="Tell us about your project..."
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="flex justify-center pt-4">
                  <Button type="submit">Submit Project</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </motion.div>
  );
};
