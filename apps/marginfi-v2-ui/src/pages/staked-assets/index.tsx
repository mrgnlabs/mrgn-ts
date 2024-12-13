import Link from "next/link";

import { PageHeading } from "~/components/common/PageHeading";

import { Button } from "~/components/ui/button";

export default function StakedAssetsPage() {
  return (
    <div className="flex flex-col justify-center items-center">
      <PageHeading heading="Staked Asset Banks" body={<p>Deposit your native stake and use it as collateral.</p>} />
      <Button asChild>
        <Link href="/staked-assets/create">Create Staked Asset Bank</Link>
      </Button>
    </div>
  );
}
