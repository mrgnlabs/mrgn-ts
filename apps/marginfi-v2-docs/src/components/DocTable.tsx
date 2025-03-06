import React from 'react'
import { PortableText, PortableTextComponents } from '@portabletext/react'
import clsx from 'clsx'

interface DocItem {
  name?: string
  parametersString?: string
  resultType?: string
  description?: any[]
}

interface DocTableProps {
  title?: string
  items?: DocItem[]
}

function CodePill({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-zinc-800 px-2 py-1 font-mono text-sm text-white">
      {children}
    </code>
  );
}

export function DocTable({ title, items = [] }: DocTableProps) {
  const descriptionComponents: PortableTextComponents = {
    marks: {
      strong: ({children}) => <strong className="text-white">{children}</strong>,
      em: ({children}) => <em>{children}</em>,
      code: ({children}) => <code className="text-zinc-200 font-mono">{children}</code>,
    },
    list: {
      bullet: ({children}) => <ul className="list-disc pl-4 space-y-1">{children}</ul>,
      number: ({children}) => <ol className="list-decimal pl-4 space-y-1">{children}</ol>,
    },
    listItem: {
      bullet: ({children}) => <li>{children}</li>,
      number: ({children}) => <li>{children}</li>,
    },
    block: {
      normal: ({children}) => <div className="my-2">{children}</div>,
    }
  };

  return (
    <div className="my-6">
      {/* Heading */}
      {title && (
        <h2 className="mb-6 text-xl font-semibold text-white">
          {title}
        </h2>
      )}

      {/* Table Layout */}
      <div className="divide-y divide-zinc-700/40">
        {/* Header Row */}
        <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-x-6 pb-4">
          <div className="text-sm font-semibold text-zinc-400">Method Name</div>
          <div className="text-sm font-semibold text-zinc-400">Parameters</div>
          <div className="text-sm font-semibold text-zinc-400">Result Type(s)</div>
          <div className="text-sm font-semibold text-zinc-400">Description</div>
        </div>

        {/* Content Rows */}
        {items.map((item, index) => (
          <div key={index} className="grid grid-cols-[auto_1fr_auto_1fr] gap-x-6 py-4">
            <div>
              <CodePill>{item.name || '—'}</CodePill>
            </div>
            <div>
              {item.parametersString?.split(',').map((param, i) => (
                <div key={i} className="whitespace-pre-wrap">
                  <code className="text-zinc-200 font-mono">{param.trim()}</code>
                </div>
              ))}
            </div>
            <div>
              <CodePill>{item.resultType || '—'}</CodePill>
            </div>
            <div className="text-zinc-400">
              {item.description ? (
                <PortableText 
                  value={item.description} 
                  components={descriptionComponents}
                />
              ) : '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 