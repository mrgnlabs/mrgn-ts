import { useRouter } from "next/router";
import Head from "next/head";
import { Button } from "~/components/ui/button";

export default function NotAllowed() {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center pt-16">
      <Head>
        <title>Access Denied</title>
      </Head>
      <div className="p-8 rounded-lg shadow-lg text-center">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-lg mb-6">Sorry, you are not allowed to access this page from your current location.</p>
        <Button onClick={() => router.push("/")}>Go to Homepage</Button>
      </div>
    </div>
  );
}
