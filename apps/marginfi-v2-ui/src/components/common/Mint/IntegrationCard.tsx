import Image from "next/image";
import Link from "next/link";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { IconExternalLink } from "~/components/ui/icons";
import { Skeleton } from "~/components/ui/skeleton";

import { IntegrationsData } from "~/utils";

interface IntegrationCardProps {
  integrationsData: IntegrationsData;
}

export const IntegrationCard = ({ integrationsData }: IntegrationCardProps) => {
  if (!integrationsData.info?.tvl && !integrationsData.info?.vol) {
    return null;
  }

  return (
    <Card variant="default" className="min-w-[300px]">
      <CardHeader>
        <CardTitle className="flex items-center justify-center text-xl">
          <div className="flex items-center">
            {typeof integrationsData.baseIcon === "string" ? (
              <Image
                alt={integrationsData.baseIcon}
                src={integrationsData.baseIcon}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <integrationsData.baseIcon size={32} />
            )}
            {typeof integrationsData.quoteIcon === "string" ? (
              <Image
                alt={integrationsData.quoteIcon}
                src={integrationsData.quoteIcon}
                width={40}
                height={40}
                className="z-10 w-10 h-10 rounded-full -translate-x-3"
              />
            ) : (
              <integrationsData.quoteIcon size={32} className="z-10 -translate-x-4" />
            )}
          </div>
          {integrationsData.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {integrationsData.info?.tvl && (
            <li className="flex items-center justify-between gap-1">
              <span className="text-muted-foreground">TVL:</span> {integrationsData.info.tvl}
            </li>
          )}
          {integrationsData.info?.vol && (
            <li className="flex items-center justify-between gap-1">
              <span className="text-muted-foreground">24hr Vol:</span> {integrationsData.info.vol}
            </li>
          )}
        </ul>

        <Link href={integrationsData.link} target="_blank" rel="noreferrer" className="w-full">
          <Button variant="default" size="lg" className="mt-4 w-full">
            {integrationsData.action} <IconExternalLink size={20} />
          </Button>
        </Link>

        <div className="flex items-center gap-2 mt-4 justify-center">
          {integrationsData.platform.icon && <integrationsData.platform.icon size={24} />}
          <p className="text-muted-foreground text-sm">{integrationsData.platform.title}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export const IntegrationCardSkeleton = () => {
  return (
    <Card variant="default" className="min-w-[300px]">
      <CardHeader>
        <CardTitle className="flex items-center justify-center text-xl">
          <div className="flex items-center">
            <Skeleton className="h-[32px] w-[32px] rounded-full" />
            <Skeleton className="h-[32px] w-[32px] rounded-full -translate-x-3" />
          </div>
          <Skeleton className="h-[25px] w-[75px] rounded-lg" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          <li className="flex items-center justify-between gap-1">
            <Skeleton className="h-[25px] w-[50px] rounded-lg" /> <Skeleton className="h-[25px] w-[75px] rounded-lg" />
          </li>
          <li className="flex items-center justify-between gap-1">
            <Skeleton className="h-[25px] w-[50px] rounded-lg" /> <Skeleton className="h-[25px] w-[75px] rounded-lg" />
          </li>
        </ul>

        <Skeleton className="mt-4 w-full h-[40px] rounded-lg" />

        <div className="flex items-center gap-2 mt-4 justify-center">
          <Skeleton className="h-[24px] w-[24px] rounded-full" />
          <Skeleton className="h-[20px] w-[40px] rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
};
