import { Prose } from '~/components/Prose'
import { Note } from '~/components/mdx'
import { ImageComponent } from '~/components/ImageComponent'
import { Math } from '~/components/Math'
import { PortableText } from '@portabletext/react'

const components = {
  types: {
    note: ({value}: any) => (
      <Note>
        <PortableText value={value.content} components={components} />
      </Note>
    ),
    mathBlock: ({value}: any) => (
      <Math>{value.formula}</Math>
    ),
    imageWithCaption: ({value}: any) => (
      <ImageComponent
        src={value.image.asset.url}
        alt={value.alt || ''}
        isBig={true}
      />
    ),
  },
  block: {
    normal: ({children}: any) => <p>{children}</p>,
    h1: ({children}: any) => <h1>{children}</h1>,
    h2: ({children}: any) => <h2>{children}</h2>,
  },
}

export function DocPage({ page }: { page: any }) {
  if (!page) {
    return <div>Loading...</div>
  }

  return (
    <Prose className="pt-16 pb-10">
      <h1>{page.title}</h1>
      <p className="lead">{page.leadText}</p>
      <hr className="my-8" />
      
      {page.content?.map((section: any) => {
        if (section._type === 'section') {
          return (
            <div key={section._key} className="mt-12">
              {section.tag && (
                <div className="mb-1 text-sm font-mono text-zinc-400">
                  {section.tag}
                </div>
              )}
              <h2>{section.title}</h2>
              {section.label && (
                <p className="text-sm text-zinc-500 italic -mt-4 mb-4">
                  {section.label}
                </p>
              )}
              <PortableText 
                value={section.content} 
                components={components}
              />
            </div>
          )
        }
        
        return (
          <div key={section._key} className="my-8">
            <PortableText 
              value={[section]} 
              components={components}
            />
          </div>
        )
      })}
    </Prose>
  )
} 