import React from "react";

import { IconSearch } from "@tabler/icons-react";
import { EmodeTag } from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { Button } from "~/components/ui/button";
import { IconEmodeSimple } from "~/components/ui/icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import Link from "next/link";
import { EmodeTable } from "./emode-table";

interface EmodeExploreProps {
  trigger?: React.ReactNode;
  initialBank?: ExtendedBankInfo;
  emodeTag?: EmodeTag;
}

const EmodeExplore = ({ trigger, initialBank, emodeTag }: EmodeExploreProps) => {
  const defaultTrigger = (
    <Button>
      <IconSearch size={16} />
      Explore e-mode pairs
    </Button>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent
        className="overflow-visible p-2 md:p-6 md:py-8 md:max-w-2xl"
        closeClassName="md:-top-8 md:-right-8 md:z-50"
      >
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-3xl font-normal flex items-center gap-2">
            Explore{" "}
            <div className="flex items-center gap-1">
              <IconEmodeSimple size={32} />
              e-mode
            </div>
            {emodeTag && <span className="lowercase"> {EmodeTag[emodeTag]}</span>}
            pairs
          </DialogTitle>
          <DialogDescription>
            View e-mode pairs and boosted weights.
            <br />
            For more information{" "}
            <Link
              href="https://docs.marginfi.com/emode"
              target="_blank"
              rel="noreferrer"
              className="border-b border-foreground/50 transition-colors hover:border-transparent"
            >
              read the documentation
            </Link>
            .
          </DialogDescription>
        </DialogHeader>
        <EmodeTable initialBank={initialBank} emodeTag={emodeTag} />
      </DialogContent>
    </Dialog>
  );
};

export { EmodeExplore };
