import { IconSparkles, IconSearch } from "@tabler/icons-react";
import { EmodePair } from "@mrgnlabs/marginfi-client-v2";
import { cn } from "@mrgnlabs/mrgn-utils";

import { EmodeExplore, EmodeStrategies } from "~/components/common/emode/components";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Button } from "~/components/ui/button";
import { IconEmodeSimple, IconEmodeSimpleInactive } from "~/components/ui/icons";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

type EmodePortfolioProps = {
  extendedBankInfos: ExtendedBankInfo[];
  userActiveEmodes: EmodePair[];
  filterEmode?: boolean;
  setFilterEmode?: (filterEmode: boolean) => void;
};

const EmodePortfolio = ({
  extendedBankInfos,
  userActiveEmodes,
  filterEmode = false,
  setFilterEmode,
}: EmodePortfolioProps) => {
  const emodeActive = userActiveEmodes.length > 0;
  return (
    <div className="flex flex-col lg:flex-row items-center gap-3 justify-between">
      <div
        className={cn(
          "py-1 w-full flex items-center justify-between lg:justify-start gap-3 transition-opacity duration-500"
        )}
      >
        <div className="flex items-center justify-between text-sm mr-2 gap-1 shrink-0 text-muted-foreground">
          {emodeActive ? <IconEmodeSimple size={18} /> : <IconEmodeSimpleInactive size={18} />}
          e-mode {!emodeActive && "in"}active
        </div>
        <div className="flex items-center gap-3">
          <EmodeExplore
            trigger={
              <Button variant="secondary" size="sm">
                <IconSearch size={12} />
                Explore e-mode pairs
              </Button>
            }
          />
        </div>
      </div>
      <EmodeStrategies extendedBankInfos={extendedBankInfos} />
      {emodeActive && setFilterEmode && (
        <div className="items-center gap-2 shrink-0 hidden lg:flex">
          <Label htmlFor="pairings" className="text-sm text-muted-foreground flex items-center gap-1">
            <IconSparkles size={14} /> Highlight e-mode
          </Label>
          <Switch
            checked={filterEmode}
            onCheckedChange={(checked) => setFilterEmode(checked)}
            className="ml-2 outline-none focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=unchecked]:bg-background-gray-light data-[state=checked]:bg-mfi-emode"
          />
        </div>
      )}
    </div>
  );
};

export { EmodePortfolio };
