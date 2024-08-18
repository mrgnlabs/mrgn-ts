import React from "react";

import Link from "next/link";

import { IconTrendingDown } from "@tabler/icons-react";

import { Button } from "~/components/ui/button";

export default function FourOhFour() {
  return (
    <div className="pt-12 flex flex-col items-center gap-2">
      <IconTrendingDown size={100} className="text-mrgn-error" />
      <div className="flex flex-col items-center gap-8">
        <h1 className="text-4xl font-medium font-orbitron">404 - Page not found</h1>
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button>Start trading</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
