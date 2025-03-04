import Link from 'next/link'
import clsx from 'clsx'

import { Feedback } from '~/components/Feedback'
import { Heading } from '~/components/Heading'
import { Prose } from '~/components/Prose'

export const a = Link
export { Button } from '~/components/Button'
export { CodeGroup, Code as code, Pre as pre } from '~/components/Code'

export function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <article className="flex h-full flex-col pb-10 pt-16">
      <Prose className="flex-auto">{children}</Prose>
      <footer className="mx-auto mt-16 w-full max-w-2xl lg:max-w-5xl">
        <Feedback />
      </footer>
    </article>
  )
}

export const h2 = function H2(
  props: Omit<React.ComponentPropsWithoutRef<typeof Heading>, 'level'>,
) {
  return <Heading level={2} {...props} />
}

function InfoIcon(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <circle cx="8" cy="8" r="8" strokeWidth="0" />
      <path
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M6.75 7.75h1.5v3.5"
      />
      <circle cx="8" cy="4" r=".5" fill="none" />
    </svg>
  )
}

export function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 flex gap-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-50/50 p-4 leading-6 text-emerald-900 dark:border-mrgn-chartreuse/30 dark:bg-mrgn-chartreuse/5 dark:text-mrgn-chartreuse/80 dark:[--tw-prose-links-hover:theme(colors.mrgn-chartreuse/70)] dark:[--tw-prose-links:theme(colors.white)]">
      <InfoIcon className="mt-1 h-4 w-4 flex-none fill-emerald-500 stroke-white dark:fill-mrgn-chartreuse/20 dark:stroke-mrgn-chartreuse/70" />
      <div className="[&>:first-child]:mt-0 [&>:last-child]:mb-0">
        {children}
      </div>
    </div>
  )
}

export function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-start gap-x-16 gap-y-10 xl:max-w-none xl:grid-cols-2">
      {children}
    </div>
  )
}

export function Col({
  children,
  sticky = false,
}: {
  children: React.ReactNode
  sticky?: boolean
}) {
  return (
    <div
      className={clsx(
        '[&>:first-child]:mt-0 [&>:last-child]:mb-0',
        sticky && 'xl:sticky xl:top-24',
      )}
    >
      {children}
    </div>
  )
}

export function Properties({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6">
      <div className="overflow-hidden rounded-lg bg-zinc-900 shadow dark:ring-1 dark:ring-white/10">
        {/* Header Row */}
        <div className="grid grid-cols-2 gap-4 border-b border-zinc-700/40 bg-zinc-800/40 px-4 py-3 dark:border-zinc-800">
          <div className="text-sm font-semibold text-zinc-200">Contract Name</div>
          <div className="text-sm font-semibold text-zinc-200">Address</div>
        </div>
        {/* Content */}
        <ul role="list" className="divide-y divide-zinc-700/40 dark:divide-zinc-800">
          {children}
        </ul>
      </div>
    </div>
  )
}

export function Property({
  name,
  children,
  type,
}: {
  name: string
  children: React.ReactNode
  type?: string
}) {
  return (
    <li className="grid grid-cols-2 gap-4 px-4 py-3">
      <div className="text-sm text-zinc-300">{name}</div>
      <div className="font-mono text-sm text-zinc-400">
        {type || children}
      </div>
    </li>
  )
}
