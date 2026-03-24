import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full" style={{ background: '#0a0a0f' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col" style={{ marginLeft: '240px' }}>
        <Header />
        <main className="flex-1 overflow-auto pt-14">
          {children}
        </main>
      </div>
    </div>
  )
}
