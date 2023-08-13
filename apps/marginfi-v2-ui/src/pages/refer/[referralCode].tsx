import { useRouter } from "next/router";
import { useEffect, useMemo } from "react";

export default function ReferralPage() {
  const router = useRouter();
  const { referralCode } = useMemo(() => router.query, [router]);

  useEffect(() => {
    if (typeof window !== "undefined" && referralCode) {
      const newUrl = `${window.location.origin}/points?referralCode=${referralCode}`;
      router.push(newUrl);
    }
  }, [referralCode, router]);

  return null;
}
