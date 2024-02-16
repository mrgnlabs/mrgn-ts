import Link from "next/link";

import { PageHeader } from "~/components/common/PageHeader";
import { Button } from "~/components/ui/button";

export default function MigrateAccountPage() {
  return (
    <>
      <PageHeader>Migrate Account</PageHeader>
      <div className="flex flex-col items-center max-w-md mx-auto py-8 space-y-8">
        <header className="text-center space-y-4">
          <h1 className="text-3xl font-medium">Migrate your marginfi account</h1>
          <p>
            There are multiple accounts associated with your wallet address. Please ensure the correct account is
            selected before migrating.
          </p>
        </header>
        <div className="flex items-center justify-center gap-4">
          <Link href="/migrate/account">
            <Button>Migrate Account</Button>
          </Link>
          <Link href="/migrate/points">
            <Button>Migrate Points</Button>
          </Link>
        </div>
      </div>
    </>
  );
}
