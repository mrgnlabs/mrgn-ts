import React from 'react'

interface DocItem {
  name?: string
  parametersString?: string
  resultType?: string
  description?: string
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
  return (
    <div className="my-6">
      {/* Heading */}
      {title && (
        <h2 className="mb-4 text-xl font-semibold text-white">
          {title}
        </h2>
      )}

      {/* Table Layout */}
      <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-x-4 gap-y-8">
        {/* Header Row */}
        <div className="col-span-4 contents text-sm font-semibold text-zinc-400">
          <div>Name</div>
          <div>Parameters</div>
          <div>Result Type(s)</div>
          <div>Description</div>
        </div>

        {/* Content Rows */}
        {items.map((item, index) => (
          <div key={index} className="col-span-4 contents text-sm text-zinc-400">
            <div>
              <CodePill>{item.name || '—'}</CodePill>
            </div>
            <div>
              {item.parametersString?.split(',').map((param, i) => (
                <div key={i} className="whitespace-pre-wrap">
                  {param.trim()}
                </div>
              ))}
            </div>
            <div>
              <CodePill>{item.resultType || '—'}</CodePill>
            </div>
            <div>{item.description || '—'}</div>
          </div>
        ))}
      </div>
    </div>
  )
} 