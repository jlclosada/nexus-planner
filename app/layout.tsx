import type { Metadata } from 'next'
import './globals.css'
import { SessionProvider } from '@/components/providers/SessionProvider'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'Nexus — Agile Project Management',
  description: 'The most advanced Agile/Scrum project management platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className="h-full antialiased">
        <SessionProvider>
          <QueryProvider>
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: '#1a1a2e',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#f1f5f9',
                },
              }}
            />
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
