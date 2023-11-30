import React from "react";

import { cn } from "~/utils";

import { MrgnLabeledSwitch } from "~/components/common/MrgnLabeledSwitch";

import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Button } from "~/components/ui/button";
import { IconChevronDown } from "~/components/ui/icons";

export const ActionBox = () => {
  const [isTokenPopoverOpen, setIsTokenPopoverOpen] = React.useState(false);
  return (
    <div className="bg-background p-4 flex flex-col items-center gap-4">
      <div className="space-y-6 text-center w-full flex flex-col items-center">
        <div className="flex w-[150px] h-[42px]">
          <MrgnLabeledSwitch labelLeft="Lend" labelRight="Borrow" checked={true} onClick={() => {}} />
        </div>
        <p>Supply. Earn interest. Borrow. Repeat.</p>
      </div>
      <div className="p-6 bg-background-gray text-white w-full max-w-[480px] rounded-xl">
        <p className="text-lg mb-3">You supply</p>
        <div className="bg-background text-3xl rounded-lg flex justify-between items-center p-4 font-medium mb-5">
          <Popover open={isTokenPopoverOpen} onOpenChange={(open) => setIsTokenPopoverOpen(open)}>
            <PopoverTrigger asChild>
              <Button
                className={cn(
                  "bg-background-gray text-white text-xl p-6 pr-4 gap-4 transition-colors hover:bg-background-gray-light",
                  isTokenPopoverOpen && "bg-background-gray-light"
                )}
              >
                Select token <IconChevronDown />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start" sideOffset={10}>
              <ul className="flex flex-col gap-4">
                <li>Token item 1</li>
                <li>Token item 2</li>
                <li>Token item 3</li>
              </ul>
            </PopoverContent>
          </Popover>
          <input
            type="number"
            value={0}
            className="bg-transparent w-full text-right"
            style={{ WebkitAppearance: "none" }}
          />
        </div>
        <Button className="w-full py-6">Select token and amount</Button>
      </div>
    </div>
  );
};
