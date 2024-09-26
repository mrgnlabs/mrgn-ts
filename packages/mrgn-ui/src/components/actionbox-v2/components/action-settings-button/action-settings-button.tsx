import { IconSettings } from "@tabler/icons-react";

interface ActionSettingsButtonProps {
  setIsSettingsActive: (isSettingsActive: boolean) => void;
}

export const ActionSettingsButton = ({ setIsSettingsActive }: ActionSettingsButtonProps) => {
  return (
    <div className="flex justify-between">
      <div className="flex justify-end gap-2 ml-auto">
        <button
          onClick={() => setIsSettingsActive(true)}
          className="text-xs gap-1 h-6 px-2 flex items-center rounded-full border border-background-gray-light bg-transparent hover:bg-background-gray-light text-muted-foreground"
        >
          Settings <IconSettings size={16} />
        </button>
      </div>
    </div>
  );
};
