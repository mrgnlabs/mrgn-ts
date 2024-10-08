import { forwardRef } from 'react'
import Link from 'next/link'
import clsx from 'clsx'
import { motion, useScroll, useTransform } from 'framer-motion'

import { Button } from '~/components/Button'
import { Logo } from '~/components/Logo'
import {
  MobileNavigation,
  useIsInsideMobileNavigation,
} from '~/components/MobileNavigation'
import { useMobileNavigationStore } from '~/components/MobileNavigation'
import { MobileSearch, Search } from '~/components/Search'

function TopLevelNavItem({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <li>
      <Link
        href={href}
        className="text-sm leading-5 text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
      >
        {children}
      </Link>
    </li>
  )
}

export const Header = forwardRef<
  React.ElementRef<'div'>,
  { className?: string }
>(function Header({ className }, ref) {
  let { isOpen: mobileNavIsOpen } = useMobileNavigationStore()
  let isInsideMobileNavigation = useIsInsideMobileNavigation()

  let { scrollY } = useScroll()
  let bgOpacityLight = useTransform(scrollY, [0, 72], [0.5, 0.9])
  let bgOpacityDark = useTransform(scrollY, [0, 72], [0.2, 0.8])

  return (
    <motion.div
      ref={ref}
      className={clsx(
        className,
        'fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between gap-12 px-4 transition sm:px-6 lg:left-72 lg:z-30 lg:px-8 xl:left-80',
        !isInsideMobileNavigation &&
          'backdrop-blur-sm lg:left-72 xl:left-80 dark:backdrop-blur',
        isInsideMobileNavigation
          ? 'bg-white dark:bg-zinc-900'
          : 'bg-white/[var(--bg-opacity-light)] dark:bg-zinc-900/[var(--bg-opacity-dark)]',
      )}
      style={
        {
          '--bg-opacity-light': bgOpacityLight,
          '--bg-opacity-dark': bgOpacityDark,
        } as React.CSSProperties
      }
    >
      <div
        className={clsx(
          'absolute inset-x-0 top-full h-px transition',
          (isInsideMobileNavigation || !mobileNavIsOpen) &&
            'bg-zinc-900/7.5 dark:bg-white/7.5',
        )}
      />
      <Search />
      <div className="flex items-center gap-5 lg:hidden">
        <MobileNavigation />
        <Link href="/" aria-label="Home" className="flex items-center gap-4 text-3xl">
          <Logo size={32} wordmark={false} />
          <motion.span>
            marginfi
          </motion.span>
        </Link>
      </div>
      
      <div className="flex items-center gap-5">
        {/* <nav className="hidden md:block">
          <ul role="list" className="flex items-center gap-8">
            <TopLevelNavItem href="/">API</TopLevelNavItem>
            <TopLevelNavItem href="#">Documentation</TopLevelNavItem>
            <TopLevelNavItem href="#">Support</TopLevelNavItem>
          </ul>
        </nav> */}

        <div className="flex gap-4">
          <MobileSearch />
        </div>

        <div className="block lg:hidden h-5 w-px bg-zinc-900/10 dark:bg-white/15" />

        <div className="hidden min-[416px]:contents">
          <Button
            variant="outline"
            rel="noreferrer"
            target="_blank"
            href="https://www.marginfi.com/"
          >
            Learn More
          </Button>
          <Button
            rel="noreferrer"
            target="_blank"
            href="https://app.marginfi.com/"
          >
            Launch App
          </Button>
        </div>
      </div>
    </motion.div>
  )
})
