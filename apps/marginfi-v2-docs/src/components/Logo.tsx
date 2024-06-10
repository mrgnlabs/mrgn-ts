import Image from 'next/image';

import MarginfiLogo from '@/images/logos/mrgn-logo.svg';

export function Logo(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <Image 
      src={MarginfiLogo}
      width={32}
      alt="Marginfi Logo"
    />
  )
}
