import Link from "next/link";

import { IconInfoCircle, IconSparkles, IconBolt, IconSearch } from "@tabler/icons-react";
import { EmodeTag } from "@mrgnlabs/marginfi-client-v2";
import { EmodePair } from "@mrgnlabs/marginfi-v2-ui-state";
import { cn } from "@mrgnlabs/mrgn-utils";

import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { Badge } from "~/components/ui/badge";
import { EmodeViewAll } from "~/components/common/emode/components";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Button } from "~/components/ui/button";

type EmodePortfolioProps = {
  userActiveEmodes: EmodePair[];
  filterEmode: boolean;
  setFilterEmode: (filterEmode: boolean) => void;
};

const EmodePortfolio = ({ userActiveEmodes, filterEmode, setFilterEmode }: EmodePortfolioProps) => {
  const emodeActive = userActiveEmodes.length > 0;
  return (
    <div className="flex items-center gap-3 justify-between">
      <div className="py-2 flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm mr-2">
          <div
            className={cn(
              "w-2 h-2 bg-gray-400 rounded-full translate-y-px text-muted-foreground",
              emodeActive && "bg-mrgn-success animate-pulsate text-foreground"
            )}
          />{" "}
          e-mode {!emodeActive && "in"}active
        </div>
        <div className="flex items-center gap-3">
          {userActiveEmodes.map((pair) => (
            <EmodeViewAll
              key={pair.collateralBankTag}
              trigger={
                <Badge variant="emode">
                  <IconBolt size={16} /> {EmodeTag[pair.collateralBankTag]}
                </Badge>
              }
              emodeTag={pair.collateralBankTag}
            />
          ))}
          <EmodeViewAll
            trigger={
              <Button
                variant="outline"
                size="sm"
                className="w-full bg-background-gray h-auto py-1 text-xs font-normal hover:bg-background-gray-light"
              >
                <IconSearch size={12} />
                Explore e-mode
              </Button>
            }
          />
        </div>
      </div>
      {emodeActive && (
        <div className="flex items-center gap-2">
          <Label htmlFor="pairings" className="text-sm text-muted-foreground flex items-center gap-1">
            <IconSparkles size={14} /> Highlight e-mode
          </Label>
          <Switch
            checked={filterEmode}
            onCheckedChange={(checked) => setFilterEmode(checked)}
            className="ml-2 data-[state=unchecked]:bg-background-gray-light data-[state=checked]:bg-purple-400"
          />
        </div>
      )}
    </div>
  );
};

export { EmodePortfolio };
