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
    <div className={cn("flex items-center  gap-1", className)}>
      {!diffOnly && percentFormatterMod(finalEmodeWeight, { minFractionDigits: 0, maxFractionDigits: 2 })}{" "}
      {originalAssetWeight && (
        <span className={cn("inline-flex items-center text-xs text-white whitespace-nowrap", diffClassName)}>
          <>
            {diff ? (
              <span>
                (
                <span>
                  {diffCheck >= 0 &&
                    percentFormatterMod(originalAssetWeight, {
                      minFractionDigits: 0,
                      maxFractionDigits: 2,
                    })}
                </span>{" "}
                <span className="text-mfi-emode">+</span>
                <span className="text-mfi-emode">
                  {percentFormatterMod(diff, {
                    minFractionDigits: 0,
                    maxFractionDigits: 2,
                  })}
                </span>
                )
              </span>
            ) : (
              <span className="text-muted-foreground">(+0%)</span>
            )}
          </>
        </span>
      )}
    </div>
  );
};

export { EmodeDiff };
