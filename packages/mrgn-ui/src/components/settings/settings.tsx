import { useForm } from "react-hook-form";
import { IconSparkles } from "@tabler/icons-react";

import { cn } from "@mrgnlabs/mrgn-utils";
import { TransactionBroadcastType, TransactionPriorityType } from "@mrgnlabs/mrgn-common";

import { Form, FormControl, FormField, FormItem } from "~/components/ui/form";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

type SettingsOptions = {
  broadcastType: TransactionBroadcastType;
  priorityType: TransactionPriorityType;
  maxCap: number;
};

const broadcastTypes: { type: TransactionBroadcastType; label: string }[] = [
  { type: "BUNDLE", label: "Jito Bundles" },
  { type: "RPC", label: "RPC Priority Fees" },
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

export const Settings = ({
  onChange,
  broadcastType,
  priorityType,
  maxCap,
  recommendedBroadcastType = "BUNDLE",
}: SettingsProps) => {
  const form = useForm<SettingsForm>({
    defaultValues: {
      broadcastType,
      priorityType,
      maxCap,
    },
  });
  const formWatch = form.watch();

  function onSubmit(data: SettingsForm) {
    onChange(data);
  }

  return (
    <div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* <div className="space-y-2">
            <h2 className="text-lg font-normal flex items-center gap-2">Transaction Settings</h2>
            <p className="text-sm text-muted-foreground">These settings apply across all transactions on mrgnlend.</p>
          </div> */}
          <div className="space-y-2">
            <h3 className="font-normal ">Transaction Method</h3>
            <p className="text-xs text-muted-foreground">Choose how transactions are broadcasted to the network.</p>
            <FormField
              control={form.control}
              name="broadcastType"
              render={({ field }) => (
                <FormItem className="space-y-3 pb-2">
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value) => field.onChange(value)}
                      defaultValue={field.value.toString()}
                      className="flex justify-between"
                    >
                      {broadcastTypes.map((option) => (
                        <div
                          key={option.type}
                          className={cn(
                            "relative w-full font-light border border-transparent rounded bg-mfi-action-box-background-dark transition-colors hover:bg-mfi-action-box-background-dark/80",
                            field.value === option.type && "border-mfi-action-box-highlight"
                          )}
                        >
                          <RadioGroupItem value={option.type} id={option.type} className="hidden" />
                          <Label className={"flex flex-col p-3 gap-2 h-auto w-full text-center"} htmlFor={option.type}>
                            {option.label}
                          </Label>
                          {option.type === recommendedBroadcastType && (
                            <span className="absolute translate-y-6 bottom-0 left-0 border border-accent rounded-full text-muted-foreground bg-mfi-action-box-background-dark px-1 text-xs flex items-center gap-1">
                              <IconSparkles size={12} /> Suggested
                            </span>
                          )}
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
                    <RadioGroup
                      onValueChange={(value) => field.onChange(value)}
                      defaultValue={field.value.toString()}
                      className="flex justify-between"
                    >
                      {priorityTypes.map((option) => (
                        <div
                          key={option.type}
                          className={cn(
                            "relative w-full font-light border border-transparent rounded bg-mfi-action-box-background-dark transition-colors hover:bg-mfi-action-box-background-dark/80",
                            field.value === option.type && "border-mfi-action-box-highlight"
                          )}
                        >
                          <RadioGroupItem value={option.type} id={option.type} className="hidden" />
                          <Label className={"flex p-3 flex-col gap-2 h-auto w-full text-center"} htmlFor={option.type}>
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
              <span className="text-xs ext-muted-foreground italic pl-1">(Default: 0.01 SOL)</span>
            </p>

            <FormField
              control={form.control}
              name="maxCap"
              rules={{ max: { value: 0.2, message: "Maximum priority fee is 0.2 SOL." } }}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
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
                </FormItem>
              )}
            />
          </div>
          <div>
            <Button type="submit" className="w-full">
              Save Settings
            </Button>
            {form.formState.isDirty && <div className="text-warning text-xs mt-2">You have unsaved changes.</div>}
            {form.formState.isSubmitted && <div className="text-success text-xs mt-2">Settings saved!</div>}
          </div>
        </form>
      </Form>
    </div>
  );
};
