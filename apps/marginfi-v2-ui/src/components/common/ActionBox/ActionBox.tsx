import React from "react";

import { usdFormatter } from "@mrgnlabs/mrgn-common";
import { useUiStore } from "~/store";

import { MrgnLabeledSwitch } from "~/components/common/MrgnLabeledSwitch";
import { ActionBoxTokens } from "~/components/common/ActionBox/ActionBoxTokens";

import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";

import { LendingModes } from "~/types";

export const ActionBox = () => {
  const [lendingMode, setLendingMode, selectedToken, setSelectedToken] = useUiStore((state) => [
    state.lendingMode,
    state.setLendingMode,
    state.selectedToken,
    state.setSelectedToken,
  ]);
  const [preview, setPreview] = React.useState<{ key: string; value: string }[]>([]);
  const [amount, setAmount] = React.useState<number | null>(null);
  const amountInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!selectedToken || !amount) {
      setPreview([]);
      return;
    }

    setPreview([
      {
        key: "Your deposited amount",
        value: `${amount} ${selectedToken.meta.tokenSymbol}`,
      },
      {
        key: "Liquidation price",
        value: usdFormatter.format(amount),
      },
      {
        key: "Some property",
        value: "--",
      },
      {
        key: "Some property",
        value: "--",
      },
    ]);
  }, [selectedToken, amount]);

  React.useEffect(() => {
    if (!selectedToken || !amountInputRef.current) return;
    amountInputRef.current.focus();
  }, [selectedToken]);

  return (
    <div className="bg-background p-4 flex flex-col items-center gap-4">
      <div className="space-y-6 text-center w-full flex flex-col items-center">
        <div className="flex w-[150px] h-[42px]">
          <MrgnLabeledSwitch
            labelLeft="Lend"
            labelRight="Borrow"
            checked={lendingMode === LendingModes.BORROW}
            onClick={() => {
              setLendingMode(lendingMode === LendingModes.LEND ? LendingModes.BORROW : LendingModes.LEND);
            }}
          />
        </div>
        <p className="text-muted-foreground">Supply. Earn interest. Borrow. Repeat.</p>
      </div>
      <div className="p-6 bg-background-gray text-white w-full max-w-[480px] rounded-xl">
        <p className="text-lg mb-3">You {lendingMode === LendingModes.LEND ? "supply" : "borrow"}</p>
        <div className="bg-background text-3xl rounded-lg flex justify-between items-center p-4 font-medium mb-5">
          <ActionBoxTokens currentToken={selectedToken} setCurrentToken={setSelectedToken} />
          <Input
            type="number"
            ref={amountInputRef}
            value={amount!}
            onChange={(e) => setAmount(Number(e.target.value))}
            placeholder="0"
            className="bg-transparent w-full text-right outline-none focus-visible:outline-none focus-visible:ring-0 border-none text-3xl font-medium"
          />
        </div>
        <Button className="w-full py-6">Select token and amount</Button>
        {selectedToken !== null && amount !== null && preview.length > 0 && (
          <dl className="grid grid-cols-2 text-muted-foreground gap-y-2 mt-4 text-sm">
            {preview.map((item) => (
              <React.Fragment key={item.key}>
                <dt>{item.key}</dt>
                <dd className="text-white font-medium text-right">{item.value}</dd>
              </React.Fragment>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
};
