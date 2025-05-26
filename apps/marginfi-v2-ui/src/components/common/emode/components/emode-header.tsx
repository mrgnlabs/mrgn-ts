import Link from "next/link";

import { EmodeTag, EmodePair } from "@mrgnlabs/marginfi-client-v2";

import { EmodeExplore } from "~/components/common/emode/components";
import { IconEmode } from "~/components/ui/icons";
import { Badge } from "~/components/ui/badge";

type EmodeHeaderProps = {
  emodeGroups: EmodePair[];
};

const EmodeHeader = ({ emodeGroups }: EmodeHeaderProps) => {
  return (
    <div className="flex items-center justify-between space-y-2">
      <div className="space-y-2">
        <h2 className="flex items-center gap-1.5 text-lg font-medium">
          <IconEmode size={32} /> marginfi e-mode
        </h2>
        <p className="text-muted-foreground text-sm">
          Banks with e-mode pairings get boosted weights.
          <br className="hidden lg:block" />{" "}
          <EmodeExplore
            trigger={
              <span className="border-b border-foreground/50 transition-colors cursor-pointer hover:border-foreground hover:text-foreground">
                Explore the groups
              </span>
            }
          />{" "}
          or{" "}
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
        <div className="py-2 flex  items-end gap-2.5">
          {/* <div className="flex items-center gap-2.5">
            {emodeGroups
              .filter((group) => group.collateralBankTag !== EmodeTag.UNSET)
              .map((group) => (
                <EmodeExplore
                  key={group.collateralBankTag}
                  trigger={
                    <Badge variant="emode">
                      <IconEmode size={16} /> {EmodeTag[group.collateralBankTag]}
                    </Badge>
                  }
                  emodeTag={group.collateralBankTag}
                />
              ))}
          </div> */}
          <EmodeExplore />
        </div>
      )}
    </div>
  );
};

export { EmodeHeader };
