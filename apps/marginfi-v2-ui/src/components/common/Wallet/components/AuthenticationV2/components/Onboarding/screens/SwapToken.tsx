import { Swap } from "~/components/common/Swap";
import { cn } from "~/utils";

export const SwapToken = () => {
  return (
    <div className="w-full space-y-6 mt-8">
      <div
        className={cn(
          "relative bg-muted text-muted-foreground transition-all duration-300 w-full p-6 pt-5 rounded-lg overflow-hidden max-h-none"
        )}
      >
        <Swap />
      </div>
    </div>
  );
};
