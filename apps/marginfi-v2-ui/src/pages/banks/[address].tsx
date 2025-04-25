import React from "react";
import { useRouter } from "next/router";
import Error from "next/error";

import { useMrgnlendStore } from "~/store";

import { Loader } from "~/components/ui/loader";

export default function BankPage() {
  const router = useRouter();
  const { address } = React.useMemo(() => router.query, [router]);
  const [initialized, extendedBankInfos] = useMrgnlendStore((state) => [state.initialized, state.extendedBankInfos]);

  const bank = extendedBankInfos.find((bank) => bank.address.toBase58() === address);

  if (!initialized) {
    return <Loader label="Loading bank..." />;
  }

  if (!address) {
    return <Error statusCode={400} />;
  }

  if (!bank) {
    return <Error statusCode={404} />;
  }

  return <div>Bank {bank?.meta.tokenSymbol}</div>;
}
