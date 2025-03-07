import { cn } from "@mrgnlabs/mrgn-utils";

type ActionInputTagProps = {
  label?: string;
  amount: string;
  isDisabled: boolean;
  tag?: string;
  className?: string;
  handleOnClick: () => void;
};

export const ActionInputTag = ({
  label,
  amount,
  isDisabled,
  className,
  tag = "MAX",
  handleOnClick,
}: ActionInputTagProps) => {
  return (
    <ul className="flex flex-col gap-0.5 mt-4 text-xs w-full text-muted-foreground">
      <li className="flex justify-between items-center gap-1.5">
        <strong className="mr-auto">{label}</strong>
        <div className="flex space-x-1">
          <div>{amount}</div>
          <button
            className={cn(
              "cursor-pointer border-b border-transparent transition text-mfi-action-box-highlight hover:border-mfi-action-box-highlight disabled:opacity-50 disabled:cursor-default disabled:hover:border-transparent",
              className
            )}
            disabled={isDisabled}
            onClick={handleOnClick}
          >
            {tag}
          </button>
        </div>
      </li>
    </ul>
  );
};
