import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function VersionSwitch() {
  const pathname = usePathname()
  const isV2 = pathname.startsWith('/v2')
  const togglePath = isV2 ? pathname.replace('/v2', '') : `/v2${pathname}`

  return (
    <div className="flex items-center justify-end gap-2 py-4 px-4">
      <span className="text-sm text-zinc-600 dark:text-zinc-400">
        Version:
      </span>
      <Link
        href={togglePath}
        className="text-sm text-zinc-900 hover:text-zinc-600 dark:text-white dark:hover:text-zinc-400"
      >
        Switch to {isV2 ? 'Current' : 'v2'} Version
      </Link>
    </div>
  )
} 