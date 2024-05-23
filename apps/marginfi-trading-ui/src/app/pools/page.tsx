import Image from "next/image";
import Link from "next/link";

import random from "lodash/random";
import { IconTrendingUp, IconTrendingDown, IconSearch, IconSortDescending, IconFilter } from "@tabler/icons-react";

import { Card, CardContent, CardHeader, CardFooter, CardTitle } from "~/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";

export default function PoolsPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-8 px-4 lg:px-8 pt-8 pb-16">
      <div className="flex items-center gap-4">
        <div className="relative w-3/4">
          <IconSearch size={18} className="absolute inset-y-0 left-4 h-full" />
          <Input placeholder="Search token names / symbols" className="py-2 pr-3 pl-12 h-10 rounded-lg" />
        </div>
        <div className="flex items-center gap-4 ml-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="lg" className="py-2 h-10">
                <IconSortDescending size={20} /> Sort
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80"></PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="lg" className="py-2 h-10">
                <IconFilter size={20} /> Filter
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80"></PopoverContent>
          </Popover>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {[...new Array(15)].map((_, i) => (
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-3">
                  <Image
                    src={`https://picsum.photos/48?q=${random(0, 1000)}`}
                    width={48}
                    height={48}
                    alt={`Pool ${i + 1}`}
                    className="rounded-full"
                  />{" "}
                  <div className="flex flex-col space-y-1">
                    <span>Pool Name {i + 1}</span>
                    <span className="text-muted-foreground text-sm">POOL{i + 1}</span>
                  </div>
                  {random(0, 1) ? (
                    <IconTrendingUp className="text-mrgn-success self-start ml-auto" />
                  ) : (
                    <IconTrendingDown className="text-mrgn-error self-start ml-auto" />
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground w-2/5">
                <li className="grid grid-cols-2">
                  <strong className="font-medium text-primary">Address</strong> D14gh...f72jU
                </li>
                <li className="grid grid-cols-2">
                  <strong className="font-medium text-primary">Liquidity</strong> $1,000,000
                </li>
                <li className="grid grid-cols-2">
                  <strong className="font-medium text-primary">Vol (24h)</strong> $100,000
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <div className="flex items-center gap-3 w-full">
                <Link href="/trade/123" className="w-full">
                  <Button variant="secondary" className="w-full">
                    Long
                  </Button>
                </Link>
                <Link href="/trade/123" className="w-full">
                  <Button variant="secondary" className="w-full">
                    Short
                  </Button>
                </Link>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
