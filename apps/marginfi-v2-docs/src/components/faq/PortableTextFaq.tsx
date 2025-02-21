// src/components/faq/PortableTextFaq.tsx
import { PortableText } from '@portabletext/react'
import { Prose } from '~/components/Prose'
import Link from 'next/link'
import clsx from 'clsx'

const components = {
  block: {
    // For blocks with a "lead" style, apply the .lead class.
    lead: ({ children }: any) => <p className="lead">{children}</p>,
    // Custom headings that mimic your anchor logic if desired.
    h2: ({ children }: any) => (
        <h2 className="scroll-mt-24 text-xl font-semibold">{children}</h2>
    ),
    h3: ({ children }: any) => (
        <h3 className="scroll-mt-24 text-lg font-semibold">{children}</h3>
    ),
    blockquote: ({ children }: any) => (
        <blockquote className="my-6 border-l-4 border-zinc-300 pl-4 italic">
          {children}
        </blockquote>
    ),
  },
  marks: {
    link: ({ children, value }: any) => {
      const href = value?.href || '#'
      return (
          <Link
            href={href}
            className="text-emerald-500 underline hover:text-emerald-600"
          >
            {children}
          </Link>
      )
    },
  },
}

export function PortableTextFaq({ value }: { value: any[] }) {
  if (!value) return null

  return (
      <Prose>
        <PortableText value={value} components={components} />
      </Prose>
  )
}
