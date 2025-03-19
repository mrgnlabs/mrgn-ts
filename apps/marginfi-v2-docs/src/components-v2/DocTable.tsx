import React from 'react'
import { PortableText, PortableTextComponents } from '@portabletext/react'
import clsx from 'clsx'

interface TableItem {
  // Method fields
  name?: string
  parametersString?: string
  resultType?: string
  methodDescription?: any[]
  // Constant fields
  constantName?: string
  constantDescription?: any[]
  // Error fields
  errorName?: string
  errorDescription?: any[]
  suggestion?: any[]
}

interface DocTableProps {
  title?: string
  items?: TableItem[]
  columns: Array<{
    header: string
    key: string
    isCode?: boolean
    width?: string
  }>
}

function CodePill({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-zinc-800 px-2 py-1 font-mono text-sm text-white">
      {children}
    </code>
  );
}

export function DocTable({ title, items = [], columns }: DocTableProps) {
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

  // Determine table type and columns based on title
  const tableType = title?.toLowerCase().includes('constant') ? 'constant' 
    : title?.toLowerCase().includes('error') ? 'error' 
    : 'method';

  const defaultColumns = tableType === 'constant' ? [
    { header: 'Constant Name', key: 'constantName', isCode: true },
    { header: 'Description', key: 'constantDescription', width: '1fr' }
  ] : tableType === 'error' ? [
    { header: 'Error', key: 'errorName', isCode: true },
    { header: 'Description', key: 'errorDescription', width: '1fr' },
    { header: 'Suggestion', key: 'suggestion', width: '1fr' }
  ] : [
    { header: 'Method Name', key: 'name', isCode: true },
    { header: 'Parameters', key: 'parametersString', width: '1fr' },
    { header: 'Result Type(s)', key: 'resultType', isCode: true },
    { header: 'Description', key: 'methodDescription', width: '1fr' }
  ];

  const tableColumns = columns || defaultColumns;
  const gridCols = tableColumns.map(col => col.width || 'auto').join(' ');

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
        <div className={clsx("grid gap-x-6 pb-4")} style={{ gridTemplateColumns: gridCols }}>
          {tableColumns.map((col, index) => (
            <div key={index} className="text-sm font-semibold text-zinc-400">
              {col.header}
            </div>
          ))}
        </div>

        {/* Content Rows */}
        {items.map((item, rowIndex) => (
          <div key={rowIndex} className={clsx("grid gap-x-6 py-4")} style={{ gridTemplateColumns: gridCols }}>
            {tableColumns.map((col, colIndex) => (
              <div key={colIndex}>
                {(() => {
                  const value = item[col.key as keyof TableItem];
                  if (!value) return '—';

                  if (col.isCode) {
                    return <CodePill>{value}</CodePill>;
                  }

                  if (Array.isArray(value)) {
                    return (
                      <div className="text-zinc-400">
                        <PortableText 
                          value={value} 
                          components={descriptionComponents}
                        />
                      </div>
                    );
                  }

                  if (typeof value === 'string' && col.key === 'parametersString') {
                    return value.split(',').map((param, i) => (
                      <div key={i} className="whitespace-pre-wrap">
                        <code className="text-zinc-200 font-mono">{param.trim()}</code>
                      </div>
                    ));
                  }

                  return <div className="text-zinc-400">{value}</div>;
                })()}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
} 