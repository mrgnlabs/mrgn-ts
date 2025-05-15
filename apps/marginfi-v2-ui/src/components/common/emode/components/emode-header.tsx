import Link from "next/link";

import { IconBolt } from "@tabler/icons-react";
import { EmodeTag } from "@mrgnlabs/marginfi-client-v2";

import { EmodeViewAll } from "~/components/common/emode/components";
import { Badge } from "~/components/ui/badge";

type EmodeHeaderProps = {
  emodeGroups: string[];
};

const EmodeHeader = ({ emodeGroups }: EmodeHeaderProps) => {
  return (
    <div className="flex items-center justify-between space-y-2">
      <div className="space-y-2">
        <h2 className="flex items-center gap-1.5 text-lg font-medium">
          <IconBolt size={24} /> marginfi e-mode
        </h2>
        <p className="text-muted-foreground text-sm">
          Banks with e-mode pairings get boosted weights.
          <br className="hidden lg:block" /> Explore the groups and pairings or{" "}
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
            {emodeGroups.map((group) => (
              <EmodeViewAll
                key={group}
                trigger={
                  <Badge variant="emode">
                    <IconBolt size={16} /> {group}
                  </Badge>
                }
                initialEmodeTag={EmodeTag[group as keyof typeof EmodeTag]}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export { EmodeHeader };
