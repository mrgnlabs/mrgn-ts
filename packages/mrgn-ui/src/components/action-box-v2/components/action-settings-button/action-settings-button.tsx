import { IconSettings } from "@tabler/icons-react";

type ActionSettingsButtonProps = {
  onClick: () => void;
};

export const ActionSettingsButton = ({ onClick }: ActionSettingsButtonProps) => {
  return (
    <div className="flex justify-between ml-auto">
      <div className="flex justify-end gap-2 ml-auto">
        <button
          onClick={onClick}
          className="text-xs text-muted-foreground gap-1 px-2 py-1 flex items-center rounded-full bg-mfi-action-box-accent hover:text-foreground/80"
        >
          Settings <IconSettings size={14} />
        </button>
      </div>
    </div>
  );
};
