'use client'

import { ReactNode } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

interface ConsoleLayoutProps {
  children: ReactNode
  title: string
}

export default function ConsoleLayout({ children, title }: ConsoleLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-950">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-64">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}

