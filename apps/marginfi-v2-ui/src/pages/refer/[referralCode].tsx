import { useRouter } from 'next/router'

export default function ReferralPage() {
  const router = useRouter()
  const { referralCode } = router.query

  // redirect to your app, passing along the referral code
  if (typeof window !== 'undefined') {
    const newUrl = `${window.location.origin}/points?referralCode=${referralCode}`;
    window.location.replace(newUrl);
  }

  return null
}
