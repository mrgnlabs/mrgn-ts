import { percentFormatterMod } from "@mrgnlabs/mrgn-common";
import { cn } from "@mrgnlabs/mrgn-utils";

type EmodeDiffProps = {
  assetWeight: number;
  originalAssetWeight?: number;
  className?: string;
  diffClassName?: string;
};

const EmodeDiff = ({ assetWeight, originalAssetWeight, className, diffClassName }: EmodeDiffProps) => {
  return (
    <div className={className}>
      {percentFormatterMod(assetWeight, { minFractionDigits: 0, maxFractionDigits: 2 })}{" "}
      {originalAssetWeight && (
        <span className={cn("text-muted-foreground text-xs", diffClassName)}>
          (+
          {percentFormatterMod(assetWeight - originalAssetWeight, {
            minFractionDigits: 0,
            maxFractionDigits: 2,
          })}
          )
        </span>
      )}
    </div>
  );
};

export { EmodeDiff };
