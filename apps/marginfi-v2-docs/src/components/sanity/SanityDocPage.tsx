'use client'

import { Prose } from '~/components/Prose'
import { Note, Properties, Property, CodeGroup, MethodList, Method } from '~/components/mdx'
import { ImageComponent } from '~/components/ImageComponent'
import { Math } from '~/components/Math'
import { PortableText, PortableTextComponents } from '@portabletext/react'
import { Button } from '~/components/Button'
import { Heading } from '~/components/Heading'
import { Feedback } from '~/components/Feedback'
import { useSectionStore } from '~/components/SectionProvider'
import { useEffect } from 'react'
import { urlFor } from '~/sanity/lib/image'
import React from 'react'
import { DocTable } from '~/components/DocTable'
import { 
  DocPage, 
  SectionInfo, 
  Block, 
  ContentBlock, 
  Section,
  NoteBlock, 
  MathBlock, 
  ImageWithCaption, 
  CodeBlock, 
  DocTableBlock, 
  Method as SanityMethod
} from './SanitySchemaTypes'

const components: PortableTextComponents = {
  block: {
    h1: ({ children }) => <h1 className="mt-8 mb-4 text-2xl font-bold">{children}</h1>,
    h2: ({ children }) => {
      const id = typeof children === 'string' ? children.toString().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : '';
      return <Heading level={2} id={id}>{children}</Heading>;
    },
    h3: ({ children }) => <h3 className="mt-6 mb-4 text-xl font-semibold">{children}</h3>,
    normal: ({ children }) => <p className="mt-4 mb-4">{children}</p>,
    lead: ({ children }) => <div className="lead my-4">{children}</div>,
    blockquote: ({ children }) => <blockquote className="border-l-2 border-zinc-300 pl-4 italic">{children}</blockquote>,
  },
  types: {
    section: ({ value }) => {
      const sectionId = value.title?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || '';
      return (
        <div className="my-6 scroll-mt-16" id={sectionId}>
          {value.title && (
            <Heading level={2} id={sectionId}>
              {value.title}
            </Heading>
          )}
          {value.label && (
            <p className="text-sm text-zinc-500 italic -mt-4 mb-4">{value.label}</p>
          )}
          {value.content && (
            <div className="mt-4">
              <PortableText value={value.content} components={components} />
            </div>
          )}
        </div>
      )
    },
    contentBlock: ({ value }) => {
      const blockId = value.title?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || '';
      return (
        <div className="my-6 scroll-mt-16" id={blockId}>
          {value.title && (
            <Heading level={2} id={blockId}>
              {value.title}
            </Heading>
          )}
          {value.label && (
            <p className="text-sm text-zinc-500 italic -mt-4 mb-4">{value.label}</p>
          )}
          {value.content && (
            <div className="mt-4">
              <PortableText value={value.content} components={components} />
            </div>
          )}
        </div>
      )
    },
    note: ({ value }: { value: NoteBlock }) => (
      <Note>
        <div className="[&>:first-child]:mt-0 [&>:last-child]:mb-0">
          <PortableText value={value.content} components={components} />
        </div>
      </Note>
    ),
    math: ({ value }: { value: MathBlock }) => (
      <div className="my-6 flex justify-center">
        <Math display={true} className="text-lg">{value.formula}</Math>
      </div>
    ),
    image: ({ value }: { value: ImageWithCaption }) => (
      <ImageComponent
        src={urlFor(value.asset._ref).url()}
        alt={value.alt || ''}
        isBig={true}
      />
    ),
    code: ({ value }: { value: CodeBlock }) => {
      if (!value?.code) {
        console.error('Code block is missing required code property:', value);
        return null;
      }

      return (
        <CodeGroup title={value.filename || ''}>
          <code className={value.language ? `language-${value.language}` : undefined}>
            {value.code}
          </code>
        </CodeGroup>
      );
    },
    docTable: ({ value }: { value: DocTableBlock }) => {
      // Default method table columns
      const methodTableColumns = [
        { header: 'Method Name', key: 'name', isCode: true },
        { header: 'Parameters', key: 'parametersString', width: '1fr' },
        { header: 'Result Type(s)', key: 'resultType', isCode: true },
        { header: 'Description', key: 'description', width: '1fr' }
      ];

      // Constants table columns
      const constantsColumns = [
        { header: 'Constant Name', key: 'name', isCode: true },
        { header: 'Description', key: 'description', width: '1fr' }
      ];

      // Errors table columns
      const errorsColumns = [
        { header: 'Error', key: 'name', isCode: true },
        { header: 'Description', key: 'description', width: '1fr' },
        { header: 'Suggestion', key: 'suggestion', width: '1fr' }
      ];

      // Determine which columns to use based on the title or a type property
      let columns;
      if (value.tableType === 'constant' || value.title?.toLowerCase().includes('constant')) {
        columns = constantsColumns;
      } else if (value.tableType === 'error' || value.title?.toLowerCase().includes('error')) {
        columns = errorsColumns;
      } else {
        columns = methodTableColumns;
      }

      return (
        <DocTable 
          title={value.title} 
          items={value.items} 
          columns={columns}
        />
      );
    },
    method: ({ value }: { value: SanityMethod }) => {
      if (value.format === 'detailed') {
        return (
          <div className="my-6 space-y-6">
            {value.title && (
              <Heading level={2} id={value.title.toLowerCase().replace(/\s+/g, '-')}>
                {value.title}
              </Heading>
            )}
            {value.items.map((item, index) => (
              <div key={index} className="border-t border-zinc-700/40 pt-5">
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center">
                    <code className="rounded bg-zinc-800 px-2 py-1 font-mono text-sm text-white">
                      {item.name}
                    </code>
                  </div>
                  
                  {item.description && (
                    <div className="text-sm text-zinc-400 [&_strong]:text-white [&_code]:text-zinc-200 [&_code]:font-mono [&_em]:text-zinc-300">
                      <PortableText value={item.description} components={components} />
                    </div>
                  )}

                  {item.parameters && item.parameters.length > 0 && (
                    <div className="space-y-3">
                      <div className="text-lg text-zinc-400">Parameters:</div>
                      <ul className="list-none pl-5 space-y-3">
                        {item.parameters.map((param, paramIndex) => (
                          <li key={paramIndex} className="flex items-baseline">
                            <span className="mr-3 text-zinc-600">•</span>
                            <div>
                              <code className="rounded bg-zinc-800 px-2 py-1 font-mono text-sm text-white">
                                {param.name}
                              </code>
                              <span className="ml-2 text-zinc-400">
                                (<code className="text-zinc-200 font-mono">{param.type}</code>)
                              </span>
                              {param.optional && (
                                <span className="ml-2 text-zinc-400">(Optional)</span>
                              )}
                              <div className="mt-1 text-zinc-400">
                                <PortableText value={param.description} components={components} />
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {item.returns && (
                    <div className="text-lg text-zinc-400">
                      Returns: <code className="rounded bg-zinc-800 px-2 py-1 font-mono text-sm text-white">
                        {item.resultType}
                      </code>
                      <div className="mt-1 text-zinc-400">
                        <PortableText value={item.returns} components={components} />
                      </div>
                    </div>
                  )}

                  {item.notes && (
                    <div className="text-lg text-zinc-400">
                      Notes:
                      <div className="mt-1 text-zinc-400">
                        <PortableText value={item.notes} components={components} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      }

      if (value.format === 'table') {
        return (
          <DocTable
            title={value.title}
            items={value.items.map(item => ({
              name: item.name,
              parametersString: item.parametersString,
              resultType: item.resultType,
              description: item.description
            }))}
            columns={[
              { header: 'Method Name', key: 'name', isCode: true },
              { header: 'Parameters', key: 'parametersString', width: '1fr' },
              { header: 'Result Type(s)', key: 'resultType', isCode: true },
              { header: 'Description', key: 'description', width: '1fr' }
            ]}
          />
        )
      }

      // Simple list format
      return (
        <MethodList title={value.title || ''}>
          {value.items.map((item, index) => (
            <Method
              key={index}
              name={item.name}
              args={item.parametersString || ''}
            >
              <PortableText
                value={item.description || []}
                components={{
                  marks: {
                    strong: ({children}) => <strong className="text-white">{children}</strong>,
                    em: ({children}) => <em>{children}</em>,
                    code: ({children}) => <code className="text-zinc-200 font-mono">{children}</code>,
                  },
                  block: {
                    normal: ({children}) => <div className="text-zinc-400">{children}</div>
                  }
                }}
              />
            </Method>
          ))}
        </MethodList>
      )
    },
  },
  marks: {
    strong: ({ children }) => <strong>{children}</strong>,
    em: ({ children }) => <em>{children}</em>,
    code: ({ children }) => <code>{children}</code>,
    link: ({ value, children }) => {
      // Check if children already contain an anchor tag
      const hasNestedLink = React.Children.toArray(children).some(
        child => React.isValidElement(child) && (child.type === 'a' || child.type === Button)
      );

      if (hasNestedLink) {
        return <span className="text-mrgn-chartreuse">{children}</span>;
      }

      return (
        <Button href={value?.href} variant={value?.variant || 'text'}>
          {children}
        </Button>
      );
    },
  },
  list: {
    bullet: ({ children }) => <ul className="list-disc pl-4">{children}</ul>,
    number: ({ children }) => (
      <ol className="list-decimal pl-4">{children}</ol>
    ),
  },
  listItem: {
    bullet: ({ children }) => <li>{children}</li>,
    number: ({ children }) => <li>{children}</li>,
  },
}

function SectionTracker({ sections }: { sections: SectionInfo[] }) {
  const registerHeading = useSectionStore((state) => state.registerHeading)

  useEffect(() => {
    const registerSections = () => {
      sections.forEach((section) => {
        if (section && section.id) {
          const element = document.getElementById(section.id) as HTMLHeadingElement | null
          if (element) {
            registerHeading({
              id: section.id,
              ref: { current: element },
              offsetRem: 0,
              title: section.title || '',
              tag: section.tag,
            })
          }
        }
      })
    }

    // Initial registration after a short delay to ensure DOM is ready
    const timeoutId = setTimeout(registerSections, 100)

    // Re-register on DOM changes
    const observer = new MutationObserver(() => {
      setTimeout(registerSections, 100)
    })
    
    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['id']
    })

    return () => {
      clearTimeout(timeoutId)
      observer.disconnect()
    }
  }, [sections, registerHeading])

  return null
}

export function SanityDocPage({ page }: { page: DocPage }) {
  // Extract sections from the content
  const sections: SectionInfo[] = React.useMemo(() => {
    if (!page.content) return []
    
    // Get all contentBlock sections
    const contentBlockSections = page.content
      .filter((block): block is ContentBlock => block._type === 'contentBlock')
      .map(section => ({
        id: section.title?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || '',
        title: section.title || '',
        tag: section.label
      }))
      .filter(section => section.id !== '')
    
    // Get all section type sections
    const sectionTypeSections = page.content
      .filter((block): block is Section => block._type === 'section')
      .map(section => ({
        id: section.title?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || '',
        title: section.title || '',
        tag: section.label
      }))
      .filter(section => section.id !== '')
    
    // Combine both types of sections
    return [...contentBlockSections, ...sectionTypeSections]
  }, [page.content])

  return (
    <article className="flex h-full flex-col pb-10 pt-16">
      <SectionTracker sections={sections} />
      <Prose className="flex-auto">
        <h1>{page.title}</h1>

        {page.leadText && (
          <div className="lead">
            <PortableText value={page.leadText} components={components} />
          </div>
        )}

        <hr className="my-8" />

        {page.content && (
          <>
            {/* Process each content block individually */}
            {page.content.map((block, index) => {
              // For block types, render directly with the appropriate style
              if (block._type === 'block') {
                const blockData = block as any; // Type assertion to avoid TypeScript errors
                const style = blockData.style || 'normal';
                const blockId = typeof blockData.children?.[0]?.text === 'string' 
                  ? blockData.children[0].text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') 
                  : '';
                
                switch (style) {
                  case 'h1':
                    return <h1 key={blockData._key || index} className="mt-8 mb-4 text-2xl font-bold" id={blockId}>
                      {blockData.children?.map((child: any, i: number) => <span key={i}>{child.text}</span>)}
                    </h1>;
                  case 'h2':
                    return <Heading key={blockData._key || index} level={2} id={blockId}>
                      {blockData.children?.map((child: any, i: number) => <span key={i}>{child.text}</span>)}
                    </Heading>;
                  case 'h3':
                    return <h3 key={blockData._key || index} className="mt-6 mb-4 text-xl font-semibold" id={blockId}>
                      {blockData.children?.map((child: any, i: number) => <span key={i}>{child.text}</span>)}
                    </h3>;
                  case 'lead':
                    return <div key={blockData._key || index} className="lead my-4">
                      {blockData.children?.map((child: any, i: number) => <span key={i}>{child.text}</span>)}
                    </div>;
                  case 'blockquote':
                    return <blockquote key={blockData._key || index} className="border-l-2 border-zinc-300 pl-4 italic">
                      {blockData.children?.map((child: any, i: number) => <span key={i}>{child.text}</span>)}
                    </blockquote>;
                  default:
                    return <p key={blockData._key || index} className="my-4">
                      {blockData.children?.map((child: any, i: number) => <span key={i}>{child.text}</span>)}
                    </p>;
                }
              }
              
              // For other block types, use PortableText with our components
              return (
                <div key={(block as any)._key || index}>
                  <PortableText value={[block]} components={components} />
                </div>
              );
            })}
          </>
        )}
      </Prose>
      <footer className="mx-auto mt-16 w-full max-w-2xl lg:max-w-5xl">
        <Feedback />
      </footer>
    </article>
  )
} 