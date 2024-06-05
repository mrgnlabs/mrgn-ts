"use client";

import React from "react";

import { IconArrowRight, IconLoader, IconCheck, IconAlertTriangle } from "@tabler/icons-react";
import { motion, useInView } from "framer-motion";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { cn } from "~/lib/utils";

import { Button } from "~/components/ui/button";
import { Logo } from "~/components/ui/logo";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel } from "~/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";

import type { submitConvertKitProps } from "~/actions/submitConvertKit";

type GrantsProps = {
  formId: string;
  onSubmit: (data: submitConvertKitProps) => Promise<{
    success: boolean;
    message?: string;
  }>;
};

enum GrantState {
  DEFAULT = "default",
  LOADING = "loading",
  SUCCESS = "success",
  ERROR = "error",
}

const CONTENT = {
  heading: "Grant Gateway: Fueling the mrgn. ecosystem",
  body: (
    <p>
      Create a grant proposal to build something iconic with marginfi&apos;s liquidity,{" "}
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
  project_name: z.string(),
  project_link: z.string().url(),
  project_description: z.string(),
});

export const Grants = ({ onSubmit, formId }: GrantsProps) => {
  const [state, setState] = React.useState<GrantState>(GrantState.DEFAULT);
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const targetRef = React.useRef(null);
  const isInView = useInView(targetRef);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const submit = React.useCallback(async (values: z.infer<typeof formSchema>) => {
    setState(GrantState.LOADING);
    console.log("client side submit", values);
    const result = await onSubmit({
      formId,
      ...values,
    });
    if (result.success) {
      setState(GrantState.SUCCESS);
    } else {
      setState(GrantState.ERROR);
      setError(result.message || null);
    }
  }, []);

  const reset = React.useCallback(() => {
    form.reset();
    setState(GrantState.DEFAULT);
    setOpen(false);
  }, [form]);

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
        <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
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
            {(state === GrantState.DEFAULT || state === GrantState.LOADING) && (
              <Form {...form}>
                <form
                  className={cn("space-y-2 mt-4", state === GrantState.LOADING && "pointer-events-none animate-pulse")}
                  onSubmit={form.handleSubmit(submit)}
                >
                  <div className="grid md:grid-cols-2 gap-4 md:gap-8 mb-8">
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
                      name="project_name"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel htmlFor="project_name">Project Name</FormLabel>
                          <FormControl>
                            <Input id="project_name" className="col-span-3" placeholder="Project Name" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="project_link"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel htmlFor="project_link">Project Link</FormLabel>
                          <FormControl>
                            <Input
                              id="project_link"
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
                  <FormField
                    control={form.control}
                    name="project_description"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel htmlFor="project_description">Project Description</FormLabel>
                        <FormControl>
                          <Textarea
                            id="project_description"
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
                    <Button type="submit" disabled={state === GrantState.LOADING} className="gap-2">
                      {state === GrantState.DEFAULT && <>Submit Project</>}
                      {state === GrantState.LOADING && (
                        <>
                          <IconLoader size={18} className="animate-spin-slow" />
                          <span>Submitting project...</span>
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            )}

            {state === GrantState.SUCCESS && (
              <div className="space-y-8 pt-16 pb-4 text-sm text-center">
                <div className="space-y-2">
                  <p className="flex items-center justify-center gap-2 text-mrgn-success">
                    <IconCheck size={18} /> Thank you for submitting your grant proposal!
                  </p>
                  <p className="text-muted-foreground">We will get back to you shortly.</p>
                </div>
                <Button variant="secondary" onClick={reset}>
                  Close
                </Button>
              </div>
            )}

            {state === GrantState.ERROR && (
              <div className="space-y-8 pt-16 pb-4 text-sm text-center">
                <div className="space-y-2">
                  <p className="flex items-center justify-center gap-2 text-mrgn-error">
                    <IconAlertTriangle size={18} /> There was an error submitting your grant proposal
                  </p>
                  <p className="text-muted-foreground">{error || "Please try again later."}</p>
                </div>
                <Button variant="secondary" onClick={reset}>
                  Close
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </motion.div>
  );
};
