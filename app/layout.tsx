import type { Metadata } from 'next'
import { ThemeRegistry } from '@/components/ThemeRegistry'
import './globals.css'

export const metadata: Metadata = {
  title: 'Boat Schedule',
  description: 'Shared calendar for three boat owners',
}

export default function RootLayout({ children }: { children: React.ReactNode }): React.ReactNode {
  return (
    <html lang="en">
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  )
}
