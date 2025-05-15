import Link from "next/link";

import { IconBolt } from "@tabler/icons-react";
import { EmodeTag } from "@mrgnlabs/marginfi-client-v2";

import { EmodeViewAll } from "~/components/common/emode/components";
import { Badge } from "~/components/ui/badge";
import { EmodePair } from "@mrgnlabs/marginfi-v2-ui-state";

type EmodeHeaderProps = {
  emodeGroups: EmodePair[];
};

const EmodeHeader = ({ emodeGroups }: EmodeHeaderProps) => {
  console.log("emodeGroups", emodeGroups);
  return (
    <div className="flex items-center justify-between space-y-2">
      <div className="space-y-2">
        <h2 className="flex items-center gap-1.5 text-lg font-medium">
          <IconBolt size={24} /> marginfi e-mode
        </h2>
        <p className="text-muted-foreground text-sm">
          Banks with e-mode pairings get boosted weights.
          <br className="hidden lg:block" />{" "}
          <EmodeViewAll
            trigger={
              <span className="border-b border-foreground/50 transition-colors cursor-pointer hover:border-foreground hover:text-foreground">
                Explore the groups
              </span>
            }
          />{" "}
          and pairings or{" "}
          <Link
            href="https://docs.marginfi.com/emode"
            target="_blank"
            rel="noreferrer"
            className="border-b border-foreground/50 transition-colors hover:border-foreground hover:text-foreground"
          >
            read the docs
          </Link>{" "}
          for more information.
        </p>
      </div>
      {emodeGroups.length > 0 && (
        <div className="py-2 flex flex-col items-end gap-2.5">
          <div className="text-sm text-muted-foreground flex items-center gap-2.5">
            <p>E-mode groups</p>
            <EmodeViewAll />
          </div>
          <div className="flex items-center gap-2.5">
            {emodeGroups
              .filter((group) => group.collateralBankTag !== EmodeTag.UNSET)
              .map((group) => (
                <EmodeViewAll
                  key={group.collateralBankTag}
                  trigger={
                    <Badge variant="emode">
                      <IconBolt size={16} /> {EmodeTag[group.collateralBankTag]}
                    </Badge>
                  }
                  emodeTag={group.collateralBankTag}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export { EmodeHeader };
