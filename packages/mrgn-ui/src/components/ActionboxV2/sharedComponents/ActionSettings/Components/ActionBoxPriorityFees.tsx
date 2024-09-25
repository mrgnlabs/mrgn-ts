import React from "react";
import { useForm } from "react-hook-form";
import { IconInfoCircle } from "@tabler/icons-react";

import { cn } from "~/utils/theme-utils";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { Form, FormControl, FormField, FormItem } from "~/components/ui/form";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";

type ActionBoxPriorityFeesProps = {
  toggleSettings: (mode: boolean) => void;
  priorityFee: number;
  setPriorityFee: (value: number) => void;
};

const priorityFeeOptions = [
  {
    label: "Normal",
    value: 0,
  },
  {
    label: "High",
    value: 0.00005,
  },
  {
    label: "Mamas",
    value: 0.005,
  },
];

interface PriorityFeeForm {
  priorityFee: number;
}

export const ActionBoxPriorityFees = ({ toggleSettings, priorityFee, setPriorityFee }: ActionBoxPriorityFeesProps) => {
  const form = useForm<PriorityFeeForm>({
    defaultValues: {
      priorityFee: priorityFee,
    },
  });
  const formWatch = form.watch();

  const isCustomSlippage = React.useMemo(
    () => (priorityFeeOptions.find((value) => value.value === formWatch.priorityFee) ? false : true),
    [formWatch.priorityFee]
  );

  function onSubmit(data: PriorityFeeForm) {
    setPriorityFee(data.priorityFee);
    toggleSettings(false);
  }

  return (
    <div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <h2 className="text-lg font-normal mb-2 flex items-center gap-2">
            Set transaction priority{" "}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <IconInfoCircle size={16} />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-2">
                    <p>Priority fees are paid to the Solana network.</p>
                    <p>This additional fee helps boost how a transaction is prioritized.</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </h2>
          <FormField
            control={form.control}
            name="priorityFee"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormControl>
                  <RadioGroup
                    onValueChange={(value) => field.onChange(Number(value))}
                    defaultValue={field.value.toString()}
                    className="flex justify-between"
                  >
                    {priorityFeeOptions.map((option) => (
                      <div
                        key={option.label}
                        className={cn(
                          "w-full font-light border border-transparent rounded p-3 bg-background/50 transition-colors hover:bg-background-gray-hover",
                          field.value === option.value && "bg-background-gray-hover border-chartreuse"
                        )}
                      >
                        <RadioGroupItem
                          value={option.value.toString()}
                          id={option.value.toString()}
                          className="hidden"
                        />
                        <Label
                          className={"flex flex-col gap-2 h-auto w-full text-center"}
                          htmlFor={option.value.toString()}
                        >
                          {" "}
                          {option.label} <strong className="font-medium">{option.value} SOL</strong>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </FormControl>
              </FormItem>
            )}
          />
          <h2 className="font-normal mb-2">or set manually</h2>
          <FormField
            control={form.control}
            name="priorityFee"
            rules={{ max: { value: 0.2, message: "Maximum priority fee is 0.2 SOL." } }}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative">
                    <Input
                      type="decimal"
                      min={0}
                      max={0.2}
                      value={isCustomSlippage ? field.value : undefined}
                      placeholder={isCustomSlippage ? field.value.toString() : "0"}
                      onChange={(e) => field.onChange(e)}
                      className={cn(
                        "h-auto bg-background/50 py-3 px-4 border border-transparent text-white transition-colors focus-visible:ring-0",
                        isCustomSlippage && "border-chartreuse"
                      )}
                    />
                    <span className="absolute inset-y-0 right-3 text-sm flex items-center">SOL</span>
                  </div>
                </FormControl>
                {form.formState.errors.priorityFee && (
                  <p className="text-destructive-foreground text-sm">{form.formState.errors.priorityFee.message}</p>
                )}
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full py-5">
            Save Settings
          </Button>
        </form>
      </Form>
    </div>
  );
};
