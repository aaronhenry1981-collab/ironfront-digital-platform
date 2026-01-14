'use client'

import Link from 'next/link'
import { ReactNode } from 'react'

interface PublicLayoutProps {
  children: ReactNode
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Top Nav */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-medium text-gray-900">
                Iron Front
              </Link>
            </div>
            <div className="hidden md:flex space-x-8">
              <Link href="/" className="text-gray-600 hover:text-gray-900 text-sm">
                Home
              </Link>
              <Link href="/scale" className="text-gray-600 hover:text-gray-900 text-sm">
                Scale
              </Link>
              <Link href="/launch" className="text-gray-600 hover:text-gray-900 text-sm">
                LaunchPath™
              </Link>
              <Link href="/ecosystems" className="text-gray-600 hover:text-gray-900 text-sm">
                Ecosystems
              </Link>
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900 text-sm">
                Pricing
              </Link>
              <Link href="/console/organization" className="text-gray-600 hover:text-gray-900 text-sm">
                Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex flex-wrap justify-center md:justify-start gap-6 mb-4 md:mb-0">
              <Link href="/scale" className="text-sm text-gray-600 hover:text-gray-900">
                Scale
              </Link>
              <Link href="/launch" className="text-sm text-gray-600 hover:text-gray-900">
                Launch
              </Link>
              <Link href="/ecosystems" className="text-sm text-gray-600 hover:text-gray-900">
                Ecosystems
              </Link>
              <Link href="/pricing" className="text-sm text-gray-600 hover:text-gray-900">
                Pricing
              </Link>
              <Link href="/apply" className="text-sm text-gray-600 hover:text-gray-900">
                Apply
              </Link>
            </div>
            <div className="flex gap-6">
              <Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-700">
                Privacy
              </Link>
              <Link href="/terms" className="text-sm text-gray-500 hover:text-gray-700">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

