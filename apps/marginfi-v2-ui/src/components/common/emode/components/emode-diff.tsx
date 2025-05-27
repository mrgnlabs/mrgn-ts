import { percentFormatterMod } from "@mrgnlabs/mrgn-common";
import { cn } from "@mrgnlabs/mrgn-utils";

type EmodeDiffProps = {
  assetWeight: number;
  originalAssetWeight?: number;
  className?: string;
  diffClassName?: string;
  diffOnly?: boolean;
};

const EmodeDiff = ({
  assetWeight,
  originalAssetWeight,
  className,
  diffClassName,
  diffOnly = false,
}: EmodeDiffProps) => {
  const diff = Math.max(assetWeight - (originalAssetWeight || 0), 0);
  const diffCheck = Number(diff.toFixed(2));
  const finalEmodeWeight = Math.max(assetWeight, originalAssetWeight || 0);

  return (
    <div className={className}>
      {!diffOnly && percentFormatterMod(finalEmodeWeight, { minFractionDigits: 0, maxFractionDigits: 2 })}{" "}
      {originalAssetWeight && (
        <span className={cn("text-muted-foreground text-xs", diffClassName)}>
          <>
            ({diffCheck >= 0 ? "+" : ""}
            {diff
              ? percentFormatterMod(diff, {
                  minFractionDigits: 0,
                  maxFractionDigits: 2,
                })
              : "0%"}
            )
          </>
        </span>
      )}
    </div>
  );
};

export { EmodeDiff };
