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
    <div className="h-[143px] bg-gradient-to-br from-[#161A1D] to-[#130D1B] rounded-lg">
      <div
        className="flex items-center justify-between space-y-2 w-full h-full bg-cover bg-center px-8"
        style={{
          backgroundImage: `url("/emode-header.png")`,
        }}
      >
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-3xl font-medium -translate-x-1">
            <IconEmode size={38} /> marginfi e-mode
          </h2>
          <p className="text-muted-foreground">
            Banks with e-mode pairings get boosted weights.
            <br className="hidden lg:block" />{" "}
            <EmodeExplore
              trigger={
                <span className="text-foreground border-b border-foreground/50 transition-colors cursor-pointer hover:border-transparent">
                  Explore the groups
                </span>
              }
            />{" "}
            or{" "}
            <Link
              href="https://docs.marginfi.com/emode"
              target="_blank"
              rel="noreferrer"
              className="text-foreground border-b border-foreground/50 transition-colors hover:border-transparent"
            >
              read the docs
            </Link>{" "}
            for more information.
          </p>
        </div>
        {emodeGroups.length > 0 && (
          <div className="py-2 flex  items-end gap-2.5">
            <EmodeExplore />
          </div>
        )}
      </div>
    </div>
  );
};

export { EmodeHeader };
