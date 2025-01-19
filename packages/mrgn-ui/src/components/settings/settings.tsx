import React from "react";
import { useForm } from "react-hook-form";
import { useDebounce } from "@uidotdev/usehooks";

import {
  cn,
  usePrevious,
  slippageOptions,
  MAX_SLIPPAGE_PERCENTAGE,
  STATIC_SIMULATION_ERRORS,
  Mobile,
  Desktop,
} from "@mrgnlabs/mrgn-utils";
import { MaxCapType, TransactionBroadcastType, TransactionPriorityType } from "@mrgnlabs/mrgn-common";

import { Form, FormControl, FormField, FormItem, FormMessage } from "~/components/ui/form";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/components/ui/accordion";

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

export interface SettingsProps extends SettingsOptions {
  recommendedBroadcastType?: TransactionBroadcastType;
  onChange: (options: SettingsOptions) => void;
  slippageProps?: {
    slippageBps: number;
    setSlippageBps: (slippageBps: number) => void;
  };
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

  // Slippage
  const slippageForm = useForm<{
    slippageBps: number;
  }>({
    defaultValues: {
      slippageBps: props.slippageProps?.slippageBps,
    },
  });
  const prevSlippageFormIsDirty = usePrevious(slippageForm.formState.isDirty);

  const slippageFormWatch = slippageForm.watch();

  const isCustomSlippage = React.useMemo(
    () => (slippageOptions.find((value) => value.value === slippageFormWatch.slippageBps) ? false : true),
    [slippageFormWatch.slippageBps]
  );

  const onSlippageSubmit = React.useCallback(
    (data: { slippageBps: number }) => {
      props.slippageProps?.setSlippageBps(data.slippageBps);
      slippageForm.reset(data);
    },
    [slippageForm, props.slippageProps]
  );

  const handleOnSlippageSubmit = React.useCallback(() => {
    slippageForm.handleSubmit(onSlippageSubmit)();
  }, [slippageForm, onSlippageSubmit]);

  React.useEffect(() => {
    if (slippageForm.formState.isDirty && !prevSlippageFormIsDirty) {
      handleOnSlippageSubmit();
    }
  }, [slippageForm.formState.isDirty, prevSlippageFormIsDirty, handleOnSlippageSubmit]);

  const renderSection = (title: string, description: string, children: React.ReactNode) => {
    return (
      <div className="space-y-4">
        <div className="space-y-0.5">
          <Desktop>
            <h3 className="font-normal ">{title}</h3>
          </Desktop>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        {children}
      </div>
    );
  };

  const renderTransactionMethodSection = () => {
    return (
      <FormField
        control={form.control}
        name="broadcastType"
        render={({ field }) => (
          <FormItem className="space-y-3 ">
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
    );
  };

  const renderTransactionPrioritySection = () => {
    return (
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
    );
  };

  const renderPriorityFeeCapSection = () => {
    return (
      <>
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
                      "focussed:border-mfi-action-box-highlight text-lg md:text-base "
                    )}
                  />
                  <span className="absolute inset-y-0 right-3 text-sm flex items-center">SOL</span>
                </div>
              </FormControl>
              <FormMessage className="text-xs text-warning" />
            </FormItem>
          )}
        />
      </>
    );
  };

  const renderSlippageSection = () => {
    return (
      <>
        <FormField
          control={slippageForm.control}
          name="slippageBps"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormControl>
                <RadioGroup
                  onValueChange={(value) => {
                    field.onChange(Number(value));
                  }}
                  defaultValue={field.value.toString()}
                  className="flex gap-4 justify-between"
                >
                  {slippageOptions.map((option) => (
                    <div
                      key={option.label}
                      className={cn(
                        "relative w-full font-light border border-transparent rounded bg-mfi-action-box-background-dark transition-colors hover:bg-mfi-action-box-background-dark/80",
                        field.value === option.value && "border-mfi-action-box-highlight"
                      )}
                    >
                      <RadioGroupItem value={option.value.toString()} id={option.label.toString()} className="hidden" />
                      <Label
                        className={"flex p-2 flex-col h-auto w-full text-xs gap-0.5 text-center cursor-pointer"}
                        htmlFor={option.label.toString()}
                      >
                        {option.label} <strong className="font-medium text-sm">{option.value} %</strong>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <h4 className="font-normal text-sm">Or set manually</h4>
        <FormField
          control={slippageForm.control}
          name="slippageBps"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="relative">
                  <Input
                    type="decimal"
                    min={0}
                    value={isCustomSlippage ? field.value : undefined}
                    placeholder={isCustomSlippage ? field.value.toString() : "0"}
                    onChange={(e) => field.onChange(e)}
                    className={cn("h-auto py-3 px-4 border text-lg md:text-base", isCustomSlippage && "bg-accent")}
                    autoFocus={false}
                  />
                  <span className="absolute inset-y-0 right-3 text-sm flex items-center">%</span>
                </div>
              </FormControl>
              {field.value > MAX_SLIPPAGE_PERCENTAGE && (
                <FormMessage className="text-xs px-1">
                  {STATIC_SIMULATION_ERRORS.SLIPPAGE_TOO_HIGH.description}
                </FormMessage>
              )}
            </FormItem>
          )}
        />
      </>
    );
  };

  return (
    <div className="space-y-6 ">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Mobile>
            <Accordion type="multiple" className="space-y-4">
              <AccordionItem value="transaction-method" className="py-2">
                <AccordionTrigger className="py-0 ">Transaction Method</AccordionTrigger>
                <AccordionContent className="py-0">
                  {renderSection(
                    "Transaction Method",
                    "Set the method you want to use to send your transaction.",
                    renderTransactionMethodSection()
                  )}
                </AccordionContent>{" "}
              </AccordionItem>
              <AccordionItem value="transaction-priority" className="py-2">
                <AccordionTrigger className="py-0 ">Transaction Priority</AccordionTrigger>
                <AccordionContent className="py-0 ">
                  {renderSection(
                    "Transaction Priority",
                    "Set the priority of your transaction.",
                    renderTransactionPrioritySection()
                  )}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="priority-fee-cap" className="py-2">
                <AccordionTrigger className="py-0 ">Priority Fee Cap</AccordionTrigger>
                <AccordionContent className="py-0">
                  {renderSection(
                    "Priority Fee Cap",
                    "Set the maximum fee you are willing to pay for a transaction.",
                    renderPriorityFeeCapSection()
                  )}
                </AccordionContent>
              </AccordionItem>
              {props.slippageProps && (
                <AccordionItem value="maximum-slippage" className="py-2">
                  <AccordionTrigger className="py-0 ">Maximum Slippage</AccordionTrigger>
                  <AccordionContent className="py-0">
                    {renderSection(
                      "Maximum Slippage",
                      "Set the maximum slippage you are willing to accept for a transaction.",
                      renderSlippageSection()
                    )}
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </Mobile>
          <Desktop>
            <div className="space-y-4">
              {renderSection(
                "Transaction Method",
                "Set the method you want to use to send your transaction.",
                renderTransactionMethodSection()
              )}
              {renderSection(
                "Transaction Priority",
                "Set the priority of your transaction.",
                renderTransactionPrioritySection()
              )}
              {renderSection(
                "Priority Fee Cap",
                "Set the maximum fee you are willing to pay for a transaction.",
                renderPriorityFeeCapSection()
              )}
              {props.slippageProps && (
                <div className="space-y-4">
                  {renderSection(
                    "Maximum Slippage",
                    "Set the maximum slippage you are willing to accept for a transaction.",
                    renderSlippageSection()
                  )}
                </div>
              )}
            </div>
          </Desktop>
        </form>
      </Form>
    </div>
  );
};
