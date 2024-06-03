import Link from "next/link";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "~/components/ui/card";

export default function MigrateAccountPage() {
  return (
    <>
      <div className="flex flex-col items-center w-full max-w-3xl mx-auto pb-8 space-y-12">
        <header className="text-center space-y-4 max-w-md mx-auto">
          <h1 className="text-3xl font-medium">Marginfi Migration</h1>
          <p>Marginfi migration tools. Please proceed with caution.</p>
        </header>
        <div className="w-full flex flex-col items-center justify-center gap-8 px-6 md:flex-row">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Migrate Account</CardTitle>
              <CardDescription>Migrate your account to a new authority.</CardDescription>
            </CardHeader>
            <CardContent></CardContent>
            <CardFooter>
              <Link href="/migrate/account">
                <Button variant="outline">Start account migration</Button>
              </Link>
            </CardFooter>
          </Card>
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Migrate Points</CardTitle>
              <CardDescription>Migrate your points from one wallet to another.</CardDescription>
            </CardHeader>
            <CardContent></CardContent>
            <CardFooter>
              <Link href="/migrate/points">
                <Button variant="outline">Start points migration</Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </>
  );
}
