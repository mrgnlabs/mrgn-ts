import React from "react";
import { useForm } from "react-hook-form";
import { useDebounce } from "@uidotdev/usehooks";

import { cn, usePrevious } from "@mrgnlabs/mrgn-utils";
import { MaxCapType, TransactionBroadcastType, TransactionPriorityType } from "@mrgnlabs/mrgn-common";

import { Form, FormControl, FormField, FormItem, FormMessage } from "~/components/ui/form";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

type SettingsOptions = {
  broadcastType: TransactionBroadcastType;
  priorityType: TransactionPriorityType;
  maxCapType: MaxCapType;
  maxCap: number;
};

const broadcastTypes: { type: TransactionBroadcastType; label: string; isDisabled: boolean }[] = [
  { type: "DYNAMIC", label: "Dynamic", isDisabled: false },
  { type: "BUNDLE", label: "Bundles", isDisabled: false },
  { type: "RPC", label: "RPC", isDisabled: false },
];

const maxCapTypes: { type: MaxCapType; label: string }[] = [
  { type: "MANUAL", label: "Manual" },
  { type: "DYNAMIC", label: "Dynamic" },
];

const priorityTypes: { type: TransactionPriorityType; label: string }[] = [
  { type: "NORMAL", label: "Normal" },
  { type: "HIGH", label: "High" },
  { type: "MAMAS", label: "Mamas" },
];

interface SettingsForm extends SettingsOptions {}

interface SettingsProps extends SettingsOptions {
  recommendedBroadcastType?: TransactionBroadcastType;
  onChange: (options: SettingsOptions) => void;
}

export const Settings = ({ onChange, recommendedBroadcastType = "BUNDLE", ...props }: SettingsProps) => {
  const [isReadyToSubmit, setIsReadyToSubmit] = React.useState(false);
  const form = useForm<SettingsForm>({
    defaultValues: props,
  });

  const prevIsDirty = usePrevious(form.formState.isDirty);

  const formValues = form.watch();

  const onSubmit = React.useCallback(
    (data: SettingsForm) => {
      onChange(data);
      form.reset(data);
    },
    [form, onChange]
  );

  const handleOnSubmit = React.useCallback(() => {
    form.handleSubmit(onSubmit)();
  }, [form, onSubmit]);

  React.useEffect(() => {
    if (form.formState.isDirty && !prevIsDirty) {
      handleOnSubmit();
    }
  }, [form.formState.isDirty, prevIsDirty, handleOnSubmit]);

  return (
    <div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Add this again if sequential transaction are more stabel */}
          <div className="space-y-2">
            <h3 className="font-normal ">Transaction Method</h3>
            <p className="text-xs text-muted-foreground">Choose how transactions are broadcasted to the network.</p>
            <FormField
              control={form.control}
              name="broadcastType"
              render={({ field }) => (
                <FormItem className="space-y-3 pb-2">
                  <FormControl>
                    <RadioGroup defaultValue={field.value.toString()} className="flex justify-between">
                      {broadcastTypes.map((option) => (
                        <div
                          key={option.type}
                          className={cn(
                            "relative w-full font-light border border-transparent rounded bg-mfi-action-box-background-dark transition-colors hover:bg-mfi-action-box-background-dark/80",
                            field.value === option.type && "border-mfi-action-box-highlight"
                          )}
                        >
                          <RadioGroupItem value={option.type} id={option.type} className="hidden" />
                          <Label
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              field.onChange(option.type);
                            }}
                            className={cn(
                              "flex flex-col p-3 gap-2 h-auto w-full text-center cursor-pointer",
                              option.isDisabled && "cursor-not-allowed opacity-50"
                            )}
                            htmlFor={option.type}
                          >
                            {option.label}
                          </Label>
                          {/* {option.type === recommendedBroadcastType && (
                            <span className="absolute translate-y-6 bottom-0 left-0 border border-accent rounded-full text-muted-foreground bg-mfi-action-box-background-dark px-1 text-xs flex items-center gap-1">
                              <IconSparkles size={12} /> Suggested
                            </span>
                          )} */}
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <div className="w-full border-b border-accent" />
          <div className="space-y-2">
            <h3 className="font-normal ">Transaction Priority</h3>
            <FormField
              control={form.control}
              name="priorityType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormControl>
                    <RadioGroup defaultValue={field.value.toString()} className="flex justify-between">
                      {priorityTypes.map((option) => (
                        <div
                          key={option.type}
                          className={cn(
                            "relative w-full font-light border border-transparent rounded bg-mfi-action-box-background-dark transition-colors hover:bg-mfi-action-box-background-dark/80",
                            field.value === option.type && "border-mfi-action-box-highlight"
                          )}
                        >
                          <RadioGroupItem value={option.type} id={option.type} className="hidden" />
                          <Label
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              field.onChange(option.type);
                            }}
                            className={"flex p-3 flex-col gap-2 h-auto w-full text-center cursor-pointer"}
                            htmlFor={option.type}
                          >
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <div className="space-y-2">
            <h4 className="font-normal text-sm">Set Priority Fee Cap</h4>
            <p className="text-xs text-muted-foreground">
              Set the maximum fee you are willing to pay for a transaction.
            </p>

            {/* For maxCapType */}
            <FormField
              control={form.control}
              name="maxCapType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormControl>
                    <RadioGroup defaultValue={field.value} className="flex justify-between">
                      {maxCapTypes.map((option) => (
                        <div
                          key={option.type}
                          className={cn(
                            "relative w-full font-light border border-transparent rounded bg-mfi-action-box-background-dark transition-colors hover:bg-mfi-action-box-background-dark/80",
                            field.value === option.type && "border-mfi-action-box-highlight"
                          )}
                        >
                          <RadioGroupItem value={option.type} id={option.type} className="hidden" />
                          <Label
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              field.onChange(option.type);
                            }}
                            className="flex p-3 flex-col gap-2 h-auto w-full text-center cursor-pointer"
                            htmlFor={option.type}
                          >
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maxCap"
              rules={{ max: { value: 0.2, message: "Maximum priority fee is 0.2 SOL." } }}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className={cn("relative", formValues.maxCapType === "DYNAMIC" && "hidden")}>
                      <Input
                        type="decimal"
                        min={0}
                        max={0.2}
                        value={field.value}
                        placeholder={field.value.toString()}
                        onChange={(e) => field.onChange(e)}
                        className={cn(
                          "h-auto bg-mfi-action-box-background-dark py-3 px-4 border border-transparent transition-colors focus-visible:ring-0",
                          "focussed:border-mfi-action-box-highlight"
                        )}
                      />
                      <span className="absolute inset-y-0 right-3 text-sm flex items-center">SOL</span>
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs text-warning" />
                </FormItem>
              )}
            />
          </div>
        </form>
      </Form>
    </div>
  );
};
