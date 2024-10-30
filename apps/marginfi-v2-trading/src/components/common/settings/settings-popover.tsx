import { Settings } from "@mrgnlabs/mrgn-ui";
import { IconSettings } from "@tabler/icons-react";
import { Button } from "~/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";

import { useUiStore } from "~/store";

type SettingsPopoverProps = {};

export const SettingsPopover = ({}: SettingsPopoverProps) => {
  const { priorityType, broadcastType, maxCap, maxCapType, setTransactionSettings } = useUiStore((state) => ({
    priorityType: state.priorityType,
    broadcastType: state.broadcastType,
    maxCap: state.maxCap,
    maxCapType: state.maxCapType,
    setTransactionSettings: state.setTransactionSettings,
  }));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0">
          <IconSettings size={20} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <Settings
          onChange={setTransactionSettings}
          broadcastType={broadcastType}
          priorityType={priorityType}
          maxCap={maxCap}
          maxCapType={maxCapType}
        />
      </PopoverContent>
    </Popover>
  );
};
