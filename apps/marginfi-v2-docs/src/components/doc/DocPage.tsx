'use client'

// src/components/doc/DocPage.tsx
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
import clsx from 'clsx'

interface SanityImage {
  asset: {
    url: string;
  };
}

interface ImageWithCaption {
  _type: 'imageWithCaption';
  image: SanityImage;
  alt?: string;
}

interface MathBlock {
  _type: 'mathBlock';
  formula: string;
}

interface MathInline {
  _type: 'mathInline';
  formula: string;
}

interface NoteBlock {
  _type: 'note';
  content: any[];
}

interface CodeBlock {
  _type: 'codeBlock';
  code: string;
  language?: string;
  title?: string;
}

interface Section {
  _type: 'section';
  _key: string;
  title?: string;
  label?: string;
  content: any[];
}

interface SectionInfo {
  id: string;
  title: string;
  tag?: string;
}

interface Properties {
  _type: 'properties';
  _key: string;
  items?: Array<{
    name: string;
    parameters: string;
    resultType: string;
    description: any[];
  }>;
}

interface MethodListBlock {
  _type: 'methodList';
  title: string;
  methods: Array<{
    name: string;
    arguments: string;
    description: any[];
  }>;
}

interface DocTableBlock {
  _type: 'docTable';
  title?: string;
  items?: Array<{
    name?: string;
    parametersString?: string;
    resultType?: string;
    description?: any[];
    suggestion?: any[];
  }>;
}

interface MethodProperty {
  name: string;
  description?: any[];
  parameters?: Array<{
    name: string;
    type?: string;
    description?: any[];
    optional?: boolean;
  }>;
  returns?: {
    type?: string;
    description?: any[];
  };
}

interface MethodPropertiesBlock {
  _type: 'methodProperties';
  title?: string;
  items?: MethodProperty[];
}

interface SimpleProperty {
  name: string;
  type: string;
  description?: any[];
  optional?: boolean;
}

interface SimplePropertiesBlock {
  _type: 'simpleProperties';
  title?: string;
  items?: SimpleProperty[];
}

interface ObjectProperty {
  name: string;
  description?: any[];
  properties?: Array<{
    name: string;
    type: string;
    description?: any[];
    optional?: boolean;
  }>;
}

interface ObjectPropertiesBlock {
  _type: 'objectProperties';
  title?: string;
  items?: ObjectProperty[];
}

interface DocPage {
  title: string;
  leadText?: any[];
  content?: Array<Section | NoteBlock | MathBlock | ImageWithCaption | Properties | CodeBlock | MethodListBlock | DocTableBlock | MethodPropertiesBlock | SimplePropertiesBlock | ObjectPropertiesBlock>;
}

const components: PortableTextComponents = {
  types: {
    note: ({ value }: { value: NoteBlock }) => (
      <Note>
        <div className="[&>:first-child]:mt-0 [&>:last-child]:mb-0">
          <PortableText value={value.content} components={components} />
        </div>
      </Note>
    ),
    mathBlock: ({ value }: { value: MathBlock }) => (
      <div className="my-6 flex justify-center">
        <Math display={true} className="text-lg">{value.formula}</Math>
      </div>
    ),
    mathInline: ({ value }: { value: MathInline }) => (
      <Math display={false}>{value.formula}</Math>
    ),
    imageWithCaption: ({ value }: { value: ImageWithCaption }) => (
      <ImageComponent
        src={urlFor(value.image).url()}
        alt={value.alt || ''}
        isBig={true}
      />
    ),
    codeBlock: ({ value }: { value: CodeBlock }) => {
      if (!value?.code) {
        console.error('Code block is missing required code property:', value);
        return null;
      }

      return (
        <CodeGroup title={value.title || ''}>
          <code className={value.language ? `language-${value.language}` : undefined}>
            {value.code}
          </code>
        </CodeGroup>
      );
    },
    properties: ({ value }: { value: Properties }) => (
      <Properties>
        {value.items?.map((item, i) => (
          <Property 
            key={i} 
            name={item.name}
            parameters={item.parameters}
            resultType={item.resultType}
          >
            {item.description && (
              <PortableText
                value={item.description}
                components={components}
              />
            )}
          </Property>
        ))}
      </Properties>
    ),
    section: ({ value }: { value: Section }) => {
      const sectionId = value.title?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || ''
      
      return (
        <div className="scroll-mt-16" id={sectionId}>
          {value.title && (
            <Heading level={2} id={sectionId}>{value.title}</Heading>
          )}
          {value.label && (
            <p className="text-sm text-zinc-500 italic -mt-4 mb-4">{value.label}</p>
          )}
          <PortableText value={value.content} components={components} />
        </div>
      )
    },
    methodList: ({ value }: { value: MethodListBlock }) => (
      <MethodList title={value.title}>
        {value.methods?.map((method, i) => (
          <Method 
            key={i}
            name={method.name}
            args={method.arguments}
          >
            <PortableText
              value={method.description}
              components={{
                marks: {
                  strong: ({children}) => <strong>{children}</strong>,
                  em: ({children}) => <em>{children}</em>,
                  code: ({children}) => <code>{children}</code>,
                },
                block: {
                  normal: ({children}) => <div>{children}</div>
                }
              }}
            />
          </Method>
        ))}
      </MethodList>
    ),
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
      if (value.title?.toLowerCase().includes('constant')) {
        columns = constantsColumns;
      } else if (value.title?.toLowerCase().includes('error')) {
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
    methodProperties: ({ value }: { value: MethodPropertiesBlock }) => {
      const titleId = value.title?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || '';
      
      const methodDescriptionComponents: PortableTextComponents = {
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
          {value.title && <Heading level={2} id={titleId}>{value.title}</Heading>}
          <div className="space-y-6 mt-8">
            {value.items?.map((method, index) => (
              <div key={index} className={clsx(
                "pt-6",
                index !== 0 && "border-t border-zinc-700/40"
              )}>
                <div className="flex flex-col space-y-3">
                  <div className="flex items-center">
                    <code className="text-sm font-bold text-white">{method.name}</code>
                  </div>
                  {method.description && (
                    <div className="text-sm text-zinc-400">
                      <PortableText 
                        value={method.description} 
                        components={methodDescriptionComponents}
                      />
                    </div>
                  )}
                  
                  {method.parameters && method.parameters.length > 0 && (
                    <div className="mt-4">
                      <div className="text-sm font-semibold text-zinc-400">Parameters:</div>
                      <ul className="mt-2 space-y-2">
                        {method.parameters.map((param, paramIndex) => (
                          <li key={paramIndex} className="flex items-baseline">
                            <span className="mr-3 text-zinc-600">•</span>
                            <div className="flex items-baseline gap-2">
                              <code className="text-sm text-white">{param.name}</code>
                              {param.type && (
                                <span className="text-zinc-400">
                                  (<code className="text-zinc-200">{param.type}</code>)
                                </span>
                              )}
                              {param.optional && <span className="text-zinc-400">(Optional)</span>}
                              {param.description && (
                                <>
                                  <span className="text-zinc-400">:</span>
                                  <div className="text-sm text-zinc-400 inline">
                                    <PortableText 
                                      value={param.description} 
                                      components={methodDescriptionComponents}
                                    />
                                  </div>
                                </>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {method.returns && (
                    <div className="mt-4">
                      <div className="text-sm font-semibold text-zinc-400">Returns:</div>
                      <div className="mt-2">
                        {method.returns.type && (
                          <code className="text-sm text-white">{method.returns.type}</code>
                        )}
                        {method.returns.description && (
                          <div className="mt-1 text-sm text-zinc-400">
                            <PortableText 
                              value={method.returns.description} 
                              components={methodDescriptionComponents}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    },
    simpleProperties: ({ value }: { value: SimplePropertiesBlock }) => {
      const titleId = value.title?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || '';
      
      const propertyDescriptionComponents: PortableTextComponents = {
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
          {value.title && <Heading level={2} id={titleId}>{value.title}</Heading>}
          <div className="space-y-6 mt-8">
            {value.items?.map((property, index) => (
              <div key={index} className={clsx(
                "pt-6",
                index !== 0 && "border-t border-zinc-700/40"
              )}>
                <div className="flex flex-col space-y-3">
                  <div className="flex items-baseline gap-2">
                    <code className="text-sm font-bold text-white">{property.name}</code>
                    <span className="text-zinc-400">
                      (<code className="text-zinc-200">{property.type}</code>)
                    </span>
                    {property.optional && <span className="text-zinc-400">(Optional)</span>}
                  </div>
                  {property.description && (
                    <div className="text-sm text-zinc-400">
                      <PortableText 
                        value={property.description} 
                        components={propertyDescriptionComponents}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    },
    objectProperties: ({ value }: { value: ObjectPropertiesBlock }) => {
      const titleId = value.title?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || '';
      
      const propertyDescriptionComponents: PortableTextComponents = {
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
          {value.title && <Heading level={2} id={titleId}>{value.title}</Heading>}
          <div className="space-y-6 mt-8">
            {value.items?.map((object, index) => (
              <div key={index} className={clsx(
                "pt-6",
                index !== 0 && "border-t border-zinc-700/40"
              )}>
                <div className="flex flex-col space-y-3">
                  <div className="flex items-center">
                    <code className="text-sm font-bold text-white">{object.name}</code>
                  </div>
                  {object.description && (
                    <div className="text-sm text-zinc-400">
                      <PortableText 
                        value={object.description} 
                        components={propertyDescriptionComponents}
                      />
                    </div>
                  )}
                  
                  {object.properties && object.properties.length > 0 && (
                    <div className="mt-4">
                      <div className="text-sm font-semibold text-zinc-400">Properties:</div>
                      <ul className="mt-2 space-y-2">
                        {object.properties.map((property, propertyIndex) => (
                          <li key={propertyIndex} className="flex items-baseline">
                            <span className="mr-3 text-zinc-600">•</span>
                            <div className="flex items-baseline gap-2">
                              <code className="text-sm text-white">{property.name}</code>
                              {property.type && (
                                <span className="text-zinc-400">
                                  (<code className="text-zinc-200">{property.type}</code>)
                                </span>
                              )}
                              {property.optional && <span className="text-zinc-400">(Optional)</span>}
                              {property.description && (
                                <>
                                  <span className="text-zinc-400">:</span>
                                  <div className="text-sm text-zinc-400 inline">
                                    <PortableText 
                                      value={property.description} 
                                      components={propertyDescriptionComponents}
                                    />
                                  </div>
                                </>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    },
  },
  block: {
    h1: ({ children }) => <h1>{children}</h1>,
    h2: ({ children }) => {
      const id = typeof children === 'string' ? children.toLowerCase().replace(/\s+/g, '-') : ''
      return <Heading level={2} id={id}>{children}</Heading>
    },
    h3: ({ children }) => {
      const id = typeof children === 'string' ? children.toLowerCase().replace(/\s+/g, '-') : ''
      return <Heading level={3} id={id}>{children}</Heading>
    },
    normal: ({ children }) => <div className="my-4">{children}</div>,
    lead: ({ children }) => <div className="lead my-4">{children}</div>,
    blockquote: ({ children }) => <blockquote>{children}</blockquote>,
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
    mathInline: ({ value, children }) => (
      <span className="inline-flex items-baseline">
        <Math display={false}>{value.formula}</Math>
      </span>
    ),
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

export function DocPage({ page }: { page: DocPage }) {
  // Extract sections from the content
  const sections: SectionInfo[] = React.useMemo(() => {
    if (!page.content) return []
    
    // Get all sections from content
    const extractedSections = page.content
      .filter((block): block is Section => block._type === 'section')
      .map(section => ({
        id: section.title?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || '',
        title: section.title || '',
        tag: section.label
      }))
      .filter(section => section.id !== '')

    console.log('Extracted sections:', extractedSections)
    return extractedSections
  }, [page.content])

  // Log when sections change
  React.useEffect(() => {
    console.log('Current sections:', sections)
  }, [sections])

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
          <PortableText value={page.content} components={components} />
        )}
      </Prose>
      <footer className="mx-auto mt-16 w-full max-w-2xl lg:max-w-5xl">
        <Feedback />
      </footer>
    </article>
  )
}
