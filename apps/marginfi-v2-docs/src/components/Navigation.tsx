'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { AnimatePresence, motion, useIsPresent } from 'framer-motion'

import { Button } from '~/components/Button'
import { useIsInsideMobileNavigation } from '~/components/MobileNavigation'
import { useSectionStore } from '~/components/SectionProvider'
import { Tag } from '~/components/Tag'
import { remToPx } from '~/lib/remToPx'

interface NavGroup {
  title: string
  links: Array<{
    title: string
    href: string
    children?: Array<{
      title: string
      href: string
    }>
  }>
}

function useInitialValue<T>(value: T, condition = true) {
  let initialValue = useRef(value).current
  return condition ? initialValue : value
}

function TopLevelNavItem({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <li className="md:hidden">
      <Link
        href={href}
        className="block py-1 text-sm text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
      >
        {children}
      </Link>
    </li>
  )
}

function NavLink({
  href,
  children,
  tag,
  active = false,
  isAnchorLink = false,
  isParentActive = false,
}: {
  href: string
  children: React.ReactNode
  tag?: string
  active?: boolean
  isAnchorLink?: boolean
  isParentActive?: boolean
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={clsx(
        'flex justify-between gap-2 py-1 text-sm transition relative',
        isAnchorLink ? 'pl-7' : 'pl-4',
        'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
      )}
    >
      <span className="truncate">{children}</span>
      {tag && (
        <Tag variant="small" color="zinc">
          {tag}
        </Tag>
      )}
    </Link>
  )
}

function VisibleSectionHighlight({
  group,
  pathname,
  visibleSections,
}: {
  group: NavGroup
  pathname: string
  visibleSections: string[]
}) {
  let isPresent = useIsPresent()
  
  // Find the active link and its children
  const activeLink = group.links.find(link => pathname.startsWith(link.href))
  if (!activeLink) return null

  // Calculate which sections are currently visible
  const visibleChildren = activeLink.children?.filter(child => {
    const sectionId = child.href.split('#')[1]
    return visibleSections.includes(sectionId)
  }) ?? []

  if (visibleChildren.length === 0) return null

  // Calculate position and height
  let itemHeight = remToPx(2)
  let height = Math.max(1, visibleChildren.length) * itemHeight
  let firstVisibleChildIndex = activeLink.children?.findIndex(child => 
    child.href.split('#')[1] === visibleSections[0]
  ) ?? 0
  let top = firstVisibleChildIndex * itemHeight

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { delay: 0.2 } }}
      exit={{ opacity: 0 }}
      className="absolute inset-x-0 bg-zinc-800/2.5 will-change-transform dark:bg-white/2.5"
      style={{ 
        borderRadius: 8, 
        height, 
        top: `${top}px`,
        left: '0.5rem',
        right: '0.5rem'
      }}
    />
  )
}

function ActivePageMarker({
  group,
  pathname,
}: {
  group: NavGroup
  pathname: string
}) {
  let itemHeight = remToPx(2)
  let offset = remToPx(0.25)
  let activePageIndex = group.links.findIndex((link) => link.href === pathname)
  let top = offset + activePageIndex * itemHeight

  return (
    <motion.div
      layout
      className="bg-mrgn-yellow absolute left-2 h-6 w-px"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { delay: 0.2 } }}
      exit={{ opacity: 0 }}
      style={{ top }}
    />
  )
}

function NavigationGroup({
  group,
  className,
}: {
  group: NavGroup
  className?: string
}) {
  let isInsideMobileNavigation = useIsInsideMobileNavigation()
  let [pathname, sections, visibleSections] = useInitialValue(
    [
      usePathname(), 
      useSectionStore((s) => s.sections),
      useSectionStore((s) => s.visibleSections)
    ],
    isInsideMobileNavigation,
  )

  let isActiveGroup =
    group.links.findIndex((link) => 
      pathname.startsWith(link.href)
    ) !== -1

  return (
    <li className={clsx('relative mt-6', className)}>
      <motion.h2
        layout="position"
        className="text-xs font-semibold text-zinc-900 dark:text-white"
      >
        {group.title}
      </motion.h2>

      <div className="relative mt-3 pl-2">
        <motion.div
          layout
          className="absolute inset-y-0 left-2 w-px bg-zinc-900/10 dark:bg-white/5"
        />
        <ul role="list">
          {group.links.map((link) => {
            const isParentActive = pathname.startsWith(link.href)
            const shouldShowChildren = link.children && isParentActive

            return (
              <motion.li key={link.href} layout="position" className="relative">
                <NavLink 
                  href={link.href} 
                  active={link.href === pathname}
                  isParentActive={isParentActive}
                >
                  {link.title}
                </NavLink>

                {/* Render child links if they exist */}
                {shouldShowChildren && link.children && (
                  <div className="relative">
                    <AnimatePresence>
                      {isActiveGroup && (
                        <VisibleSectionHighlight 
                          group={group} 
                          pathname={pathname}
                          visibleSections={visibleSections}
                        />
                      )}
                    </AnimatePresence>
                    <motion.ul
                      role="list"
                      initial={{ opacity: 0 }}
                      animate={{
                        opacity: 1,
                        transition: { delay: 0.1 },
                      }}
                      exit={{
                        opacity: 0,
                        transition: { duration: 0.15 },
                      }}
                      className="mt-2"
                    >
                      {link.children.map((child) => {
                        const sectionId = child.href.split('#')[1]
                        return (
                          <li key={child.href}>
                            <NavLink
                              href={child.href}
                              active={false}
                              isAnchorLink
                              isParentActive={false}
                            >
                              {child.title}
                            </NavLink>
                          </li>
                        )
                      })}
                    </motion.ul>
                  </div>
                )}

                {/* Render section anchors */}
                <AnimatePresence mode="popLayout" initial={false}>
                  {link.href === pathname && sections.length > 0 && !link.children && (
                    <div className="relative">
                      <AnimatePresence>
                        {isActiveGroup && (
                          <VisibleSectionHighlight 
                            group={group} 
                            pathname={pathname}
                            visibleSections={visibleSections}
                          />
                        )}
                      </AnimatePresence>
                      <motion.ul
                        role="list"
                        initial={{ opacity: 0 }}
                        animate={{
                          opacity: 1,
                          transition: { delay: 0.1 },
                        }}
                        exit={{
                          opacity: 0,
                          transition: { duration: 0.15 },
                        }}
                      >
                        {sections.map((section) => (
                          <li key={section.id}>
                            <NavLink
                              href={`${link.href}#${section.id}`}
                              tag={section.tag}
                              isAnchorLink
                              isParentActive={false}
                            >
                              {section.title}
                            </NavLink>
                          </li>
                        ))}
                      </motion.ul>
                    </div>
                  )}
                </AnimatePresence>
              </motion.li>
            )
          })}
        </ul>
      </div>
    </li>
  )
}

export const navigation: Array<NavGroup> = [
  {
    title: 'Getting Started',
    links: [
      { 
        title: 'Introduction', 
        href: '/introduction',
        children: [
          { title: 'Lending and Borrowing', href: '/introduction#lending-and-borrowing' },
          { title: 'Fees and Yield', href: '/introduction#fees-and-yield' },
          { title: 'Account Health', href: '/introduction#account-health' }
        ]
      },
      { 
        title: 'Protocol Design', 
        href: '/protocol-design',
        children: [
          { title: 'Oracle Usage', href: '/protocol-design#oracle-usage' },
          { title: 'Interest Rate Mechanism', href: '/protocol-design#interest-rate-mechanism' },
          { title: 'Risk Management', href: '/protocol-design#risk-management' }
        ]
      },
      { title: 'Listing Criteria', href: '/listing-criteria' },
      { title: 'Use Cases', href: '/use-cases' },
      { title: 'FAQs', href: '/faqs' },
    ],
  },
  {
    title: 'SDKs',
    links: [
      { title: 'TypeScript SDK', href: '/ts-sdk' },
      { title: 'Rust (CLI) SDK', href: '/rust-sdk' },
    ],
  },
  {
    title: 'Programs',
    links: [
      { title: 'marginfi-v2', href: '/mfi-v2' },
      { title: 'Liquidity Incentive Program', href: '/lip' },
    ],
  },
  {
    title: 'Guides',
    links: [
      { title: 'Staked Collateral', href: '/staked-collateral' },
      { title: 'The Arena', href: '/the-arena' },
      { title: 'mrgnloop', href: '/mrgnloop' },
      { title: 'mrgnlend', href: '/mrgnlend' },
      { title: 'Liquid Staking Token', href: '/lst' },
      { title: 'Progressive Web App', href: '/pwa' },
    ],
  },
  // {
  //   title: 'White Papers',
  //   links: [
  //     { title: '$YBX', href: '/ybx' },
  //   ],
  // },
]

export function Navigation(props: React.ComponentPropsWithoutRef<'nav'>) {
  return (
    <nav {...props}>
      <ul role="list">
        {/* <TopLevelNavItem href="/">API</TopLevelNavItem>
        <TopLevelNavItem href="#">Documentation</TopLevelNavItem>
        <TopLevelNavItem href="#">Support</TopLevelNavItem> */}

        {navigation.map((group, groupIndex) => (
          <NavigationGroup
            key={group.title}
            group={group}
            className={groupIndex === 0 ? 'md:mt-0' : ''}
          />
        ))}

        <li className="sticky bottom-0 z-10 mt-6 min-[416px]:hidden">
          <Button href="#" className="w-full">
            Launch App
          </Button>
        </li>
      </ul>
    </nav>
  )
}
