// app/layout.tsx
import { Providers } from '~/app/providers'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="h-full">
        {/* 
          If your Providers are truly global (e.g. global Redux store, 
          global theme, etc.), keep them here. 
        */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}