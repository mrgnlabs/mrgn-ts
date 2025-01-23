import React from "react";
import { useForm } from "react-hook-form";

import {
  cn,
  usePrevious,
  slippageOptions,
  MAX_SLIPPAGE_PERCENTAGE,
  STATIC_SIMULATION_ERRORS,
} from "@mrgnlabs/mrgn-utils";
import { MaxCapType, TransactionBroadcastType, TransactionPriorityType } from "@mrgnlabs/mrgn-common";

import { Form, FormControl, FormField, FormItem, FormMessage } from "~/components/ui/form";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";

type TransactionOptions = {
  broadcastType: TransactionBroadcastType;
  priorityType: TransactionPriorityType;
  maxCapType: MaxCapType;
  maxCap: number;
};

type slippageModes = "DYNAMIC" | "FIXED";

export type JupiterOptions = {
  slippageMode: slippageModes;
  slippageBps: number;
  directRoutesOnly: boolean;
};

export const defaultJupiterOptions: JupiterOptions = {
  slippageMode: "DYNAMIC",
  slippageBps: 100,
  directRoutesOnly: false,
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

const slippageModes: { type: slippageModes; label: string }[] = [
  { type: "DYNAMIC", label: "Dynamic" },
  { type: "FIXED", label: "Fixed" },
];

interface TransactionSettingsForm extends TransactionOptions {}

export interface SettingsProps {
  transactionOptions: TransactionOptions;
  jupiterOptions: JupiterOptions;

  onTransactionOptionsChange: (options: TransactionOptions) => void;
  onJupiterOptionsChange: (options: JupiterOptions) => void;

  recommendedBroadcastType?: TransactionBroadcastType;
}

export const Settings = ({
  transactionOptions,
  jupiterOptions,
  onTransactionOptionsChange,
  onJupiterOptionsChange,
  recommendedBroadcastType = "BUNDLE",
}: SettingsProps) => {
  const [activeTab, setActiveTab] = React.useState<"transaction" | "swap">("swap");

  const form = useForm<TransactionSettingsForm>({
    defaultValues: transactionOptions,
  });

  console.log("transactionOptions", jupiterOptions);

  const prevIsDirty = usePrevious(form.formState.isDirty);

  const formValues = form.watch();

  const onSubmit = React.useCallback(
    (data: TransactionSettingsForm) => {
      onTransactionOptionsChange(data);
      form.reset(data);
    },
    [form, onTransactionOptionsChange]
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
  const slippageForm = useForm<JupiterOptions>({
    defaultValues: jupiterOptions,
  });
  const prevSlippageFormIsDirty = usePrevious(slippageForm.formState.isDirty);

  const isCustomSlippage = React.useMemo(
    () => (slippageOptions.find((value) => value.value === jupiterOptions.slippageBps) ? false : true),
    [jupiterOptions.slippageBps]
  );

  const onSlippageSubmit = React.useCallback(
    (data: JupiterOptions) => {
      console.log("onSlippageSubmit", data);
      onJupiterOptionsChange(data);
      slippageForm.reset(data);
    },
    [slippageForm, onJupiterOptionsChange]
  );

  const handleOnSlippageSubmit = React.useCallback(() => {
    slippageForm.handleSubmit(onSlippageSubmit)();
  }, [slippageForm, onSlippageSubmit]);

  React.useEffect(() => {
    if (slippageForm.formState.isDirty && !prevSlippageFormIsDirty) {
      handleOnSlippageSubmit();
    }
  }, [slippageForm.formState.isDirty, prevSlippageFormIsDirty, handleOnSlippageSubmit]);

  const handleTabChange = (value: "transaction" | "swap") => {
    setActiveTab(value);
  };

  const renderTransactionSettings = () => {
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-0.5">
                <h3 className="font-normal ">Transaction Method</h3>
                <p className="text-xs text-muted-foreground">
                  Set the method you want to use to send your transaction.
                </p>
              </div>
              <FormField
                control={form.control}
                name="broadcastType"
                render={({ field }) => (
                  <FormItem className="space-y-2 ">
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

            <div className="space-y-4">
              <div className="space-y-0.5">
                <h3 className="font-normal ">Transaction Priority</h3>
                <p className="text-xs text-muted-foreground">Set the priority of your transaction.</p>
              </div>
              <FormField
                control={form.control}
                name="priorityType"
                render={({ field }) => (
                  <FormItem className="space-y-2">
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

            <div className="space-y-4">
              <div className="space-y-0.5">
                <h3 className="font-normal ">Priority Fee Cap</h3>
                <p className="text-xs text-muted-foreground">
                  Set the maximum fee you are willing to pay for a transaction.
                </p>
              </div>
              <>
                <FormField
                  control={form.control}
                  name="maxCapType"
                  render={({ field }) => (
                    <FormItem className={"space-y-2"}>
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

                {formValues.maxCapType === "MANUAL" && (
                  <FormField
                    control={form.control}
                    name="maxCap"
                    rules={{ max: { value: 0.2, message: "Maximum priority fee is 0.2 SOL." } }}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className={cn("relative", formValues.maxCapType === "DYNAMIC" && "hidden")}>
                            <Input
                              type="number"
                              min={0}
                              max={0.2}
                              step={0.01}
                              value={field.value ?? ""}
                              placeholder={field.value?.toString() ?? "0"}
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
                )}
              </>
            </div>
          </div>
        </form>
      </Form>
    );
  };

  const renderSwapSettings = () => {
    return (
      <Form {...slippageForm}>
        <form onSubmit={slippageForm.handleSubmit(onSlippageSubmit)}>
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-0.5">
                <h3 className="font-normal ">Slippage mode</h3>
                <p className="text-xs text-muted-foreground">
                  Fixed Slippage may help with transaction success rate, but exposes you to front-running, dynamic
                  slippage may ... TODO finish
                </p>
              </div>
              <FormField
                control={slippageForm.control}
                name="slippageMode"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormControl>
                      <RadioGroup
                        onValueChange={(value) => {
                          field.onChange(value);
                        }}
                        defaultValue={field.value}
                        className="flex gap-4 justify-between"
                      >
                        {slippageModes.map((option) => (
                          <div
                            key={option.type}
                            className={cn(
                              "relative w-full font-light border border-transparent rounded bg-mfi-action-box-background-dark transition-colors hover:bg-mfi-action-box-background-dark/80",
                              field.value === option.type && "border-mfi-action-box-highlight"
                            )}
                          >
                            <RadioGroupItem value={option.type} id={option.type} className="hidden" />
                            <Label
                              className="flex p-2 flex-col h-auto w-full text-xs gap-0.5 text-center cursor-pointer"
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
            {slippageForm.watch("slippageMode") === "FIXED" && (
              <div className="space-y-4">
                {/* <div className="space-y-0.5">
                  <h3 className="font-normal ">Fixed maximum slippage</h3>
                  <p className="text-xs text-muted-foreground">
                    Set the maximum slippage you are willing to accept for a transaction.
                  </p>
                </div> */}
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
                                <RadioGroupItem
                                  value={option.value.toString()}
                                  id={option.label.toString()}
                                  className="hidden"
                                />
                                <Label
                                  className={
                                    "flex p-2 flex-col h-auto w-full text-xs gap-0.5 text-center cursor-pointer"
                                  }
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
                              type="number"
                              min={0}
                              step={0.01}
                              value={isCustomSlippage ? field.value : ""}
                              placeholder={isCustomSlippage ? field.value.toString() : "0"}
                              onChange={(e) => field.onChange(e)}
                              className={cn(
                                "h-auto py-3 px-4 border text-lg md:text-base",
                                isCustomSlippage && "bg-accent"
                              )}
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
              </div>
            )}
          </div>
        </form>
      </Form>
    );
  };

  return (
    <div className="space-y-4 w-full">
      {jupiterOptions ? (
        <>
          <div className="flex flex-col items-center justify-center w-full gap-2 border-b border-mfi-action-box-border-dark pb-4 mb-4">
            <div className="w-full flex justify-between items-center ">
              <span className="text-xl font-medium">Settings</span>
              <Tabs
                defaultValue={activeTab}
                className=""
                onValueChange={(value) => handleTabChange(value as "transaction" | "swap")}
              >
                <TabsList className="">
                  <TabsTrigger value="transaction" className="">
                    Transaction
                  </TabsTrigger>
                  <TabsTrigger value="swap" className="">
                    Swap
                  </TabsTrigger>
                </TabsList>
                {/* <TabsContent value="transaction">{renderTransactionSettings()}</TabsContent>
                <TabsContent value="swap">{renderSwapSettings()}</TabsContent> */}
              </Tabs>{" "}
            </div>
            <span className="text-sm text-muted-foreground self-start">
              {activeTab === "transaction"
                ? "Manage your transactions and priority Fees."
                : "Manage your swap and slippage settings."}
            </span>
          </div>

          <div className="w-full mt-2">
            {activeTab === "transaction" ? renderTransactionSettings() : renderSwapSettings()}
          </div>
        </>
      ) : (
        renderTransactionSettings()
      )}
    </div>
  );
};
