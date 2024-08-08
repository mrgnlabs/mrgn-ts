import React from "react";

import { useRouter } from "next/router";

export default function ReferPage() {
  const router = useRouter();
  const { code } = router.query;

  React.useEffect(() => {
    // store referral code in session storage
    sessionStorage.setItem("arenaReferralCode", code as string);
    router.push("/");
  }, [code, router]);

  return <div>ReferPage = {code}</div>;
}
