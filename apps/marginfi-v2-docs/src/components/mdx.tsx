import React from 'react'
import Link from 'next/link'
import clsx from 'clsx'
import { PortableText } from '@portabletext/react'

import { Feedback } from '~/components/Feedback'
import { Heading } from '~/components/Heading'
import { Prose } from '~/components/Prose'
import { DocTable } from '~/components/DocTable'

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
      {children}
    </div>
  );
}

function CodePill({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-zinc-800 px-2 py-1 font-mono text-sm text-white">
      {children}
    </code>
  );
}

export function Property({
  name,
  parameters,
  resultType,
  children
}: {
  name: string;
  parameters?: string;
  resultType?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div>
        <CodePill>{name}</CodePill>
        {parameters && <span className="ml-2">({parameters})</span>}
        {resultType && <span className="ml-2">→ {resultType}</span>}
      </div>
      {children}
    </div>
  );
}

export function ParameterList({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <div className="text-lg text-zinc-400">Parameters:</div>
      <ul className="mt-4 list-none pl-5">
        {children}
      </ul>
    </div>
  );
}

export function Parameter({
  name,
  type,
  children,
  optional
}: {
  name: string;
  type: string;
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <li className="flex items-baseline">
      <span className="mr-3 text-zinc-600">•</span>
      <div>
        <CodePill>{name}</CodePill>
        <span className="ml-2 text-zinc-400">
          (<CodePill>{type}</CodePill>)
        </span>
        {optional && <span className="ml-2 text-zinc-400">(Optional)</span>}
        <span className="ml-2 text-zinc-400">{children}</span>
      </div>
    </li>
  );
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

// For detailed single method documentation
export function MethodDoc({
  value
}: {
  value: {
    name: string;
    description: string;
    parameters: Array<{
      name: string;
      type: string;
      description: string;
      optional?: boolean;
    }>;
    returns?: string;
    notes?: string;
  }
}) {
  return (
    <div className="space-y-6">
      <div>
        <CodePill>{value.name}</CodePill>
      </div>

      <div className="space-y-6">
        <div className="text-lg text-zinc-400">
          The <CodePill>{value.name}</CodePill> {value.description}
        </div>

        {value.parameters && value.parameters.length > 0 && (
          <div>
            <div className="text-lg text-zinc-400">Parameters:</div>
            <ul className="mt-4 list-none pl-5 space-y-3">
              {value.parameters.map((param, index) => (
                <Parameter
                  key={index}
                  name={param.name}
                  type={param.type}
                  optional={param.optional}
                >
                  {param.description}
                </Parameter>
              ))}
            </ul>
          </div>
        )}

        {value.returns && (
          <div className="text-lg text-zinc-400">
            Returns a <CodePill>{value.returns}</CodePill>
          </div>
        )}

        {value.notes && (
          <div className="text-lg text-zinc-400">
            {value.notes}
          </div>
        )}
      </div>
    </div>
  );
}

// For tabular method documentation
export function MethodTable({ 
  methods 
}: { 
  methods: Array<{
    name: string;
    parametersString: string;
    resultType: string;
    tableDescription: string;
  }> 
}) {
  return (
    <div className="my-8">
      <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-x-4 gap-y-8">
        <div className="col-span-4 contents text-sm font-semibold text-zinc-400">
          <div>Method Name</div>
          <div>Parameters</div>
          <div>Result Type(s)</div>
          <div>Description</div>
        </div>
        {methods.map((method, index) => (
          <MethodRow
            key={index}
            name={method.name}
            parameters={method.parametersString}
            resultType={method.resultType}
            description={method.tableDescription}
          />
        ))}
      </div>
    </div>
  );
}

export function MethodRow({
  name,
  parameters,
  resultType,
  description
}: {
  name: string;
  parameters: string;
  resultType: string;
  description: React.ReactNode;
}) {
  return (
    <div className="col-span-4 contents text-sm text-zinc-400">
      <div>
        <CodePill>{name}</CodePill>
      </div>
      <div>
        {parameters.split(',').map((param, i) => (
          <div key={i} className="whitespace-pre-wrap">
            {param.trim()}
          </div>
        ))}
      </div>
      <div>
        <CodePill>{resultType}</CodePill>
      </div>
      <div>{description}</div>
    </div>
  );
}

export function DocTableBlock({ value }: { value: { title?: string; items?: Array<{ name?: string; parametersString?: string; resultType?: string; description?: string }> } }) {
  const columns = value.title?.toLowerCase().includes('constant') ? [
    { header: 'Constant Name', key: 'name', isCode: true },
    { header: 'Description', key: 'description', width: '1fr' }
  ] : value.title?.toLowerCase().includes('error') ? [
    { header: 'Error', key: 'name', isCode: true },
    { header: 'Description', key: 'description', width: '1fr' },
    { header: 'Suggestion', key: 'suggestion', width: '1fr' }
  ] : [
    { header: 'Method Name', key: 'name', isCode: true },
    { header: 'Parameters', key: 'parametersString', width: '1fr' },
    { header: 'Result Type(s)', key: 'resultType', isCode: true },
    { header: 'Description', key: 'description', width: '1fr' }
  ];
  
  return <DocTable title={value.title} items={value.items} columns={columns} />
}
