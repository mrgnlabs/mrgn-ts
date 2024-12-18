import { dynamicNumeralFormatter } from "@mrgnlabs/mrgn-common";
import { cn } from "@mrgnlabs/mrgn-utils";

type PnlLabelProps = {
  pnl: number;
  className?: string;
};

const PnlLabel = ({ pnl, className }: PnlLabelProps) => {
  const positionState = pnl > 0 ? "positive" : pnl < 0 ? "negative" : "neutral";
  const pnlSign = positionState === "positive" ? "+" : positionState === "negative" ? "-" : "";
  return (
    <span
      className={cn(
        className,
        positionState === "positive" && "text-success",
        positionState === "negative" && "text-error"
      )}
    >
      {`${pnlSign}$${dynamicNumeralFormatter(Math.abs(pnl), {
        minDisplay: 0.0001,
        maxDisplay: 100000,
      })}`}
    </span>
  );
};

export { PnlLabel };
