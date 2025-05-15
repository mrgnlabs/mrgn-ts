import Link from "next/link";

import { IconInfoCircle, IconSparkles, IconBolt } from "@tabler/icons-react";
import { EmodeTag } from "@mrgnlabs/marginfi-client-v2";
import { EmodePair } from "@mrgnlabs/marginfi-v2-ui-state";

import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { Badge } from "~/components/ui/badge";
import { EmodeViewAll } from "~/components/common/emode/components";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";

type EmodePortfolioProps = {
  userActiveEmodes: EmodePair[];
  filterEmode: boolean;
  setFilterEmode: (filterEmode: boolean) => void;
};

const EmodePortfolio = ({ userActiveEmodes, filterEmode, setFilterEmode }: EmodePortfolioProps) => {
  if (userActiveEmodes.length === 0) return null;

  return (
    <div className="flex items-center gap-3 justify-between">
      <div className="py-2 flex items-center gap-3">
        <div className="flex items-center gap-1 text-sm mr-2">
          <IconBolt size={14} className="text-purple-300" /> e-mode active
        </div>
        <div className="flex items-center gap-3">
          {userActiveEmodes.map((pair) => (
            <Badge variant="emode" key={pair.collateralBankTag}>
              <IconBolt size={16} /> {EmodeTag[pair.collateralBankTag]}
            </Badge>
          ))}
          <EmodeViewAll />
        </div>
      </div>
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
    </div>
  );
};

export { EmodePortfolio };
