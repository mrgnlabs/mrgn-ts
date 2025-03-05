import Link from 'next/link'
import clsx from 'clsx'
import { PortableText } from '@portabletext/react'

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
      <ul role="list" className="m-0 list-none p-0 divide-y divide-zinc-800/50">
        {children}
      </ul>
    </div>
  )
}

export function Property({
  name,
  children,
  type,
  parameters,
  resultType,
}: {
  name: string
  children: React.ReactNode
  type?: string
  parameters?: string
  resultType?: string
}) {
  return (
    <li className="m-0 px-4 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-col gap-y-1">
        <div className="flex items-baseline gap-x-3">
          <code className="rounded bg-[#232323] px-2 py-1 text-sm font-medium text-zinc-200">{name}</code>
          <span className="font-mono text-xs text-zinc-500">{parameters || type}</span>
        </div>
        <div className="mt-1 text-sm text-zinc-400 [&>:first-child]:mt-0 [&>:last-child]:mb-0">
          {children}
        </div>
      </div>
    </li>
  )
}

export function MethodList({ title, children }: { title: string; children: React.ReactNode }) {
  const headingId = title ? title.toLowerCase().replace(/\s+/g, '-') : '';
  
  return (
    <div className="my-6">
      <Heading level={2} id={headingId}>{title || ''}</Heading>
      <div className="space-y-6">
        {children}
      </div>
    </div>
  )
}

export function Method({ 
  name, 
  args, 
  children 
}: { 
  name: string; 
  args: string; 
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-zinc-700/40 pt-5">
      <div className="flex flex-col space-y-3">
        <div className="flex items-center">
          <code className="text-sm font-bold text-white">{name}</code>
          <span className="ml-4 font-mono text-xs text-zinc-400">{args}</span>
        </div>
        <div className="text-sm text-zinc-400 [&_strong]:text-white [&_code]:text-zinc-200 [&_code]:font-mono [&_em]:text-zinc-300">
          {children}
        </div>
      </div>
    </div>
  )
}
