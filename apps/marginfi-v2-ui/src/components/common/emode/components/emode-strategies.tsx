import Image from "next/image";
import { IconSparkles } from "@tabler/icons-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { IconEmodeSimple } from "~/components/ui/icons";
import { Table, TableBody, TableCell, TableRow } from "~/components/ui/table";

const mockStrategies = [
  {
    name: "USDC",
    description: "Deposit USDC to enable e-mode rewards.",
    icon: "https://storage.googleapis.com/mrgn-public/mrgn-token-icons/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v.png",
    action: "Deposit",
  },
  {
    name: "SOL",
    description: "Deposit SOL to enable e-mode rewards.",
    icon: "https://storage.googleapis.com/mrgn-public/mrgn-token-icons/So11111111111111111111111111111111111111112.png",
    action: "Deposit",
  },
  {
    name: "LST",
    description: "Borrow LST to increase your e-mode rewards.",
    icon: "https://storage.googleapis.com/mrgn-public/mrgn-token-icons/LSTxxxnJzKDFSLr4dUkPcmCf5VyryEqzPLz5j4bpxFp.png",
    action: "Borrow",
  },
];

const EmodeStrategies = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="bg-gradient-to-r to-[#483975] from-[#292E32]">
          <IconSparkles size={18} /> e-mode strategies
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-2xl font-normal flex items-center gap-2">
            Explore{" "}
            <div className="flex items-center gap-1">
              <IconEmodeSimple size={32} />
              e-mode
            </div>
            strategies
          </DialogTitle>
          <DialogDescription className="text-sm">
            There are strategies available to help you maximize your e-mode returns.
          </DialogDescription>
        </DialogHeader>
        <div className="w-full">
          <Table>
            <TableBody>
              {mockStrategies.map((strategy) => {
                return (
                  <TableRow key={strategy.name} className="even:bg-accent">
                    <TableCell className="p-3">
                      <div className="flex items-center gap-2.5">
                        <Image
                          src={strategy.icon}
                          alt={strategy.name}
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                        {strategy.name}
                      </div>
                    </TableCell>
                    <TableCell className="p-3">
                      <p className="text-xs">{strategy.description}</p>
                    </TableCell>
                    <TableCell className="text-right p-3">
                      <Button size="sm" className="w-full">
                        {strategy.action}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { EmodeStrategies };
