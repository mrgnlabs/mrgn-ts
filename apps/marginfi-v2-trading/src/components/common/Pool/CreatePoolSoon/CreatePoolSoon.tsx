import React from "react";
import ReactDOM from "react-dom";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Confetti from "react-confetti";
import { useWindowSize } from "@uidotdev/usehooks";
import { IconConfetti, IconPlus } from "@tabler/icons-react";
import { PublicKey } from "@solana/web3.js";

import { useTradeStore } from "~/store";
import { cn } from "~/utils";
import { useIsMobile } from "~/hooks/useIsMobile";

import { Dialog, DialogContent, DialogTrigger } from "~/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "~/components/ui/form";
import { Button } from "~/components/ui/button";
import { TokenData } from "~/types";
import { formSchema } from "./types";
import { Input } from "~/components/ui/input";
import { showErrorToast } from "~/utils/toastUtils";

type CreatePoolDialogProps = {
  trigger?: React.ReactNode;
};

export const CreatePoolSoon = ({ trigger }: CreatePoolDialogProps) => {
  const [resetSearchResults, searchBanks] = useTradeStore((state) => [state.resetSearchResults, state.searchBanks]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [createPoolState, setCreatePoolState] = React.useState<"FORM" | "SUCCESS">("FORM");
  const [formData, setFormData] = React.useState<z.infer<typeof formSchema>>();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { width, height } = useWindowSize();
  const isMobile = useIsMobile();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
  });

  const onSubmit = React.useCallback(
    async (values: z.infer<typeof formSchema>) => {
      setIsSubmitting(true);
      setFormData(values);
      const poolSubmission = await fetch(`/api/pool`, {
        method: "POST",
        body: JSON.stringify({
          email: values.email,
          mint: values.mint,
          twitter: values.twitter ?? "",
        }),
      });

      if (poolSubmission.ok) {
        setCreatePoolState("SUCCESS");
      } else {
        showErrorToast("Pool submission failed.");
      }
      setIsSubmitting(false);
    },
    [setFormData, setCreatePoolState]
  );

  return (
    <>
      {createPoolState === "SUCCESS" &&
        ReactDOM.createPortal(
          <Confetti
            width={width!}
            height={height! * 2}
            recycle={false}
            opacity={0.4}
            className={cn(isMobile ? "z-[80]" : "z-[60]")}
          />,
          document.body
        )}
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) resetSearchResults();
          setIsOpen(open);
        }}
      >
        <DialogTrigger asChild>
          {trigger ? (
            trigger
          ) : (
            <Button>
              <IconPlus size={18} /> Create Pool
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="w-full space-y-4 sm:max-w-4xl md:max-w-4xl z-[70] py-20">
          {createPoolState === "FORM" && (
            <>
              <div className="text-center max-w-lg mx-auto w-full">
                <h2 className="text-3xl font-medium mb-4">Request a token listing</h2>
                <p className="text-muted-foreground mb-8">
                  Permissionless pools are coming soon.
                  <br className="hidden md:block" /> In the meantime submit your token to get listed.
                </p>
                <Form {...form}>
                  <form className={cn("space-y-6")} onSubmit={form.handleSubmit(onSubmit)}>
                    <div className="text-left space-y-8">
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="mint"
                          render={({ field, formState }) => (
                            <FormItem>
                              <div className="space-y-2 text-sm">
                                <FormLabel className={cn("font-medium", formState.errors.mint && "text-destructive")}>
                                  {formState.errors.mint && "*"}Mint address
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    className={cn(formState.errors.mint && "border-destructive")}
                                    placeholder="Enter mint address"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field, formState }) => (
                            <FormItem>
                              <div className="space-y-2 text-sm">
                                <FormLabel className={cn("font-medium", formState.errors.email && "text-destructive")}>
                                  {formState.errors.email && "*"}Email
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Enter email"
                                    type="email"
                                    className={cn(formState.errors.email && "border-destructive")}
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="twitter"
                          render={({ field, formState }) => (
                            <FormItem>
                              <div className="space-y-2 text-sm">
                                <FormLabel className="font-medium">Twitter handle</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Enter twitter handle"
                                    className={cn(formState.errors.twitter && "border-destructive")}
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Submitting..." : "Submit"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
              <div className="md:w-5/6 md:mx-auto"></div>
            </>
          )}

          {/* {createPoolState === CreatePoolState.LOADING && (
            <CreatePoolLoading
              poolCreatedData={poolCreatedData}
              setIsOpen={setIsOpen}
              setIsCompleted={(props) => onCompletion(props)}
            />
          )} */}

          {createPoolState === "SUCCESS" && (
            <div className="flex flex-col justify-center items-center gap-12">
              <div className="text-center space-y-12">
                <div className="flex flex-col items-center gap-3">
                  <IconConfetti size={48} />
                  <h2 className="text-3xl font-medium">Pool submitted!</h2>
                  <p className="text-muted-foreground">
                    Your token has been submitted. It will be verified before it shows on mrgntrade.
                  </p>
                  <Button className="mt-2" onClick={() => setIsOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
