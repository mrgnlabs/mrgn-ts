"use client";

import React from "react";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { IconCheck, IconAlertTriangle, IconLoader } from "@tabler/icons-react";

import { cn } from "~/lib/utils";

import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import { Form, FormField, FormControl, FormLabel, FormItem } from "~/components/ui/form";

import type { submitConvertKitProps } from "~/actions/submitConvertKit";

type ContactFormProps = {
  formId: string;
  onSubmit: (data: submitConvertKitProps) => Promise<{
    success: boolean;
    message?: string;
  }>;
};

enum ContactFormState {
  DEFAULT = "default",
  LOADING = "loading",
  SUCCESS = "success",
  ERROR = "error",
}

const formSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  telegram: z.string(),
  wallet_address: z.string(),
  message: z.string().optional(),
});

export const ContactForm = ({ onSubmit, formId }: ContactFormProps) => {
  const [state, setState] = React.useState<ContactFormState>(ContactFormState.DEFAULT);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const reset = React.useCallback(() => {
    form.reset();
    setState(ContactFormState.DEFAULT);
  }, [form]);

  const submit = React.useCallback(async (values: z.infer<typeof formSchema>) => {
    setState(ContactFormState.LOADING);
    console.log("client side submit", values);
    const result = await onSubmit({
      formId,
      website_contact_form: "true",
      ...values,
    });
    if (result.success) {
      setState(ContactFormState.SUCCESS);
    } else {
      setState(ContactFormState.ERROR);
      setError(result.message || null);
    }
  }, []);

  return (
    <div className="relative z-10 max-w-2xl mx-auto w-full flex items-center gap-20 py-16">
      {(state === ContactFormState.DEFAULT || state === ContactFormState.LOADING) && (
        <Form {...form}>
          <form
            className={cn(
              "w-full flex flex-col items-center justify-center gap-8",
              state === ContactFormState.LOADING && "pointer-events-none animate-pulse"
            )}
            onSubmit={form.handleSubmit(submit)}
          >
            <div className="md:grid grid-cols-2 space-y-4 w-full md:gap-8 md:space-y-0">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel htmlFor="name">Your Name</FormLabel>
                    <FormControl>
                      <Input id="name" placeholder="Your name" {...field} />
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
                      <Input id="email" type="email" placeholder="email@example.com" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="telegram"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel htmlFor="telegram">Your Telegram</FormLabel>
                    <FormControl>
                      <Input id="telegram" placeholder="@handle" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="wallet_address"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel htmlFor="wallet_address">Wallet Address</FormLabel>
                    <FormControl>
                      <Input id="wallet_address" placeholder="Your Solana wallet address" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem className="space-y-1 w-full">
                  <FormLabel htmlFor="message">Your Message</FormLabel>
                  <FormControl>
                    <Textarea id="message" placeholder="What's on your mind..." rows={6} {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button type="submit" disabled={state === ContactFormState.LOADING} className="gap-2">
              {state === ContactFormState.DEFAULT && <>Submit</>}
              {state === ContactFormState.LOADING && (
                <>
                  <IconLoader size={18} className="animate-spin-slow" />
                  <span>Submitting...</span>
                </>
              )}
            </Button>
          </form>
        </Form>
      )}

      {state === ContactFormState.SUCCESS && (
        <div className="flex flex-col items-center gap-8 pt-16 pb-4 text-sm text-center mx-auto">
          <div className="gap-2 flex flex-col items-center">
            <IconCheck size={40} />
            <p className="flex items-center justify-center gap-2 text-2xl">Thanks for getting in touch!</p>
            <p className="text-muted-foreground text-lg">We will get back to you shortly.</p>
          </div>
          <Button variant="secondary" onClick={reset}>
            Send another message
          </Button>
        </div>
      )}

      {state === ContactFormState.ERROR && (
        <div className="flex flex-col items-center gap-8 pt-16 pb-4 text-sm text-center mx-auto">
          <div className="gap-2 flex flex-col items-center">
            <IconAlertTriangle size={40} />
            <p className="flex items-center justify-center gap-2 text-2xl">
              There was an error
              <br />
              submitting your message!
            </p>
            <p className="text-muted-foreground text-lg">{error || "Please try again later."}</p>
          </div>
          <Button variant="secondary" onClick={reset}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
};
