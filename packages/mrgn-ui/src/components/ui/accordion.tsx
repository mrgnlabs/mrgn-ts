import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { cn } from "@mrgnlabs/mrgn-utils";

import { ChevronDown } from "lucide-react";

const Accordion = AccordionPrimitive.Root;

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => <AccordionPrimitive.Item ref={ref} className={className} {...props} />);
AccordionItem.displayName = "AccordionItem";

interface AccordionTriggerProps {
  variant?: "default" | "portfolio" | "wallet";
}

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> & AccordionTriggerProps
>(({ className, variant = "default", children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn("group flex flex-1 items-center justify-between py-4 font-medium transition-all", className)}
      {...props}
    >
      {children}
      <div
        className={cn(
          variant === "default" && "",
          variant === "portfolio" && "h-full flex items-start translate-y-1.5"
        )}
      >
        <ChevronDown
          className={cn(
            "shrink-0 transition-transform duration-200",
            variant === "wallet" ? "h-6 w-6" : "h-4 w-4",
            "group-data-[state=open]:rotate-180"
          )}
        />
      </div>
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

interface AccordionContentProps {
  contentClassName?: string;
}

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content> & AccordionContentProps
>(({ className, contentClassName, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className={cn(
      "overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down",
      contentClassName
    )}
    {...props}
  >
    <div className={cn("pb-4 pt-0", className)}>{children}</div>
  </AccordionPrimitive.Content>
));

AccordionContent.displayName = AccordionPrimitive.Content.displayName;

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent, ChevronDown };
