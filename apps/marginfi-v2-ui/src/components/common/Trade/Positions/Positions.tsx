import Image from "next/image";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import random from "lodash/random";
import { PublicKey } from "@solana/web3.js";

import { cn } from "~/utils/themeUtils";
import { useMrgnlendStore } from "~/store";

import { ActionBoxDialog } from "~/components/common/ActionBox";
import { Table, TableBody, TableHead, TableCell, TableHeader, TableRow } from "~/components/ui/table";
import { Button } from "~/components/ui/button";

const MOCK_POSITIONS = [
  {
    pool: "BODEN",
    size: 87,
    entryPrice: 0.2,
    markPrice: 0.18,
    liquidationPrice: 0.1,
    pl: -0.5,
  },
  {
    pool: "WIF",
    size: 110,
    entryPrice: 2,
    markPrice: 2.7,
    liquidationPrice: 2.12,
    pl: 0.5,
  },
  {
    pool: "DRIFT",
    size: 200,
    entryPrice: 0.4,
    markPrice: 0.6,
    liquidationPrice: 0.23,
    pl: 0.2,
  },
];

export const Positions = () => {
  const [extendedBankInfos] = useMrgnlendStore((state) => [state.extendedBankInfos]);
  return (
    <div className="rounded-xl">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[14%]">Pool</TableHead>
            <TableHead className="w-[14%]">Size</TableHead>
            <TableHead className="w-[14%]">Entry Price</TableHead>
            <TableHead className="w-[14%]">Mark Price</TableHead>
            <TableHead className="w-[14%]">P&L</TableHead>
            <TableHead className="w-[14%]">Liquidation price</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {MOCK_POSITIONS.map((position, index) => (
            <TableRow key={index} className="even:bg-background-gray hover:even:bg-background-gray">
              <TableCell>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Image
                    src={`https://picsum.photos/24?q=${random(0, 1000)}`}
                    width={24}
                    height={24}
                    alt={`Pool`}
                    className="rounded-full"
                  />{" "}
                  {position.pool}
                </div>
              </TableCell>
              <TableCell>{position.size}</TableCell>
              <TableCell>${position.entryPrice}</TableCell>
              <TableCell>${position.markPrice}</TableCell>
              <TableCell className={cn(position.pl > 0 && "text-success", position.pl <= 0 && "text-error")}>
                {position.pl}%
              </TableCell>
              <TableCell>${position.liquidationPrice}</TableCell>
              <TableCell className="text-right">
                <div className="flex gap-2">
                  <ActionBoxDialog requestedAction={ActionType.Deposit} requestedBank={extendedBankInfos[0]}>
                    <Button variant="secondary" size="sm">
                      Add collateral
                    </Button>
                  </ActionBoxDialog>
                  <Button variant="destructive" size="sm">
                    Close position
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
