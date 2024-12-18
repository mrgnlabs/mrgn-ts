import { dynamicNumeralFormatter } from "@mrgnlabs/mrgn-common";
import { cn } from "@mrgnlabs/mrgn-utils";

type PnlLabelProps = {
  type?: "$" | "%";
  pnl: number;
  positionSize: number;
  className?: string;
};

const PnlLabel = ({ type = "$", pnl, positionSize, className }: PnlLabelProps) => {
  const positionState = pnl > 0 ? "positive" : pnl < 0 ? "negative" : "neutral";
  const pnlSign = positionState === "positive" ? "+" : positionState === "negative" ? "-" : "";
  const pnlPercentage = (pnl / positionSize) * 100;
  return (
    <span
      className={cn(
        className,
        positionState === "positive" && "text-success",
        positionState === "negative" && "text-error"
      )}
    >
      {pnlSign}
      {type === "$" && (
        <span>
          $
          {dynamicNumeralFormatter(Math.abs(pnl), {
            minDisplay: 0.0001,
            maxDisplay: 100000,
          })}
        </span>
      )}
      {type === "%" && <span>{pnlPercentage.toFixed(2)}%</span>}
    </span>
  );
};

export { PnlLabel };
