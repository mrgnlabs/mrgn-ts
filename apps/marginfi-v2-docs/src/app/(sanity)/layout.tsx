// app/(sanity)/studio/layout.tsx
export const metadata = {
  title: 'Sanity Studio',
}

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>;
}
