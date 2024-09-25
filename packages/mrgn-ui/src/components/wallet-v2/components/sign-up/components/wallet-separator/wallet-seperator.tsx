import { cn } from "~/utils/theme-utils";

export const WalletSeperator = ({ description, onClick }: { description: string; onClick?: () => void }) => {
  return (
    <div className="flex items-center justify-center text-sm">
      <div className="h-[1px] flex-grow bg-input" />
      <span className={cn("px-6 text-gray-500 dark:text-gray-400", onClick && "cursor-pointer")} onClick={onClick}>
        {description}
      </span>
      <div className="h-[1px] flex-grow bg-input" />
    </div>
  );
};
