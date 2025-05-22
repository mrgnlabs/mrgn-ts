import { IconSparkles, IconBolt, IconSearch } from "@tabler/icons-react";
import { EmodeTag, EmodePair } from "@mrgnlabs/marginfi-client-v2";
import { cn } from "@mrgnlabs/mrgn-utils";

import { Badge } from "~/components/ui/badge";
import { EmodeViewAll } from "~/components/common/emode/components";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Button } from "~/components/ui/button";

type EmodePortfolioProps = {
  userActiveEmodes: EmodePair[];
  filterEmode?: boolean;
  setFilterEmode?: (filterEmode: boolean) => void;
};

const EmodePortfolio = ({ userActiveEmodes, filterEmode = false, setFilterEmode }: EmodePortfolioProps) => {
  const emodeActive = userActiveEmodes.length > 0;
  return (
    <div className="flex flex-col md:flex-row items-center gap-3 justify-between">
      <div
        className={cn(
          "py-2 w-full flex items-center justify-between md:justify-start gap-3 transition-opacity duration-500",
          filterEmode && "opacity-10 pointer-events-none"
        )}
      >
        <div className="flex items-center justify-between text-sm mr-2 gap-2 shrink-0 text-muted-foreground">
          <div
            className={cn(
              "w-2 h-2 bg-gray-400 rounded-full translate-y-px text-muted-foreground",
              emodeActive && "bg-mrgn-success animate-pulsate text-foreground"
            )}
          />{" "}
          e-mode {!emodeActive && "in"}active
        </div>
        <div className="flex items-center gap-3">
          {userActiveEmodes.map((pair, idx) => (
            <EmodeViewAll
              key={`${pair.collateralBankTag}-${idx}`}
              trigger={
                <Badge variant="emode" className="hidden md:flex">
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
      {emodeActive && setFilterEmode && (
        <div className="items-center gap-2 shrink-0 hidden md:flex">
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
