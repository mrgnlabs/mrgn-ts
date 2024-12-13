import { TradeSide } from "~/components/common/trade-box-v2/utils";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";

interface ActionToggleProps {
  tradeState: TradeSide;
  setTradeState: (value: TradeSide) => void;
}

export const ActionToggle = ({ tradeState, setTradeState }: ActionToggleProps) => {
  return (
    <ToggleGroup
      type="single"
      className="w-full gap-4 p-0"
      value={tradeState}
      onValueChange={(value) => {
        value && setTradeState(value as TradeSide);
      }}
    >
      <ToggleGroupItem className="w-full border" value="long" aria-label="Toggle long">
        Long
      </ToggleGroupItem>
      <ToggleGroupItem className="w-full border" value="short" aria-label="Toggle short">
        Short
      </ToggleGroupItem>
    </ToggleGroup>
  );
};
