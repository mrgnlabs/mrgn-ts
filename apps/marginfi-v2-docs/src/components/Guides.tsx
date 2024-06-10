import { Button } from '~/components/Button'
import { Heading } from '~/components/Heading'

const guides = [
  {
    href: '/mrgnlend',
    name: 'mrgnlend User Guide',
    description: 'Learn about borrowing and lending on the margnlend protocol.',
  },
  {
    href: '/lst',
    name: 'LST User Guide',
    description: 'Learn about what LST is and how to get it.',
  },
  {
    href: '/pwa',
    name: 'PWA User Guide',
    description:
      'Download marginfi as a native mobile application with this guide.',
  },
]

export function Guides() {
  return (
    <div className="my-16 xl:max-w-none">
      <Heading level={2} id="guides">
        Guides
      </Heading>
      <p>
        Want to learn more about our products? Read the user guides we&apos;ve
        created for you!
      </p>
      <div className="not-prose mt-4 grid grid-cols-1 gap-8 border-t border-zinc-900/5 pt-10 sm:grid-cols-2 xl:grid-cols-4 dark:border-white/5">
        {guides.map((guide) => (
          <div key={guide.href}>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
              {guide.name}
            </h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {guide.description}
            </p>
            <p className="mt-4">
              <Button href={guide.href} variant="text" arrow="right">
                Read more
              </Button>
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
