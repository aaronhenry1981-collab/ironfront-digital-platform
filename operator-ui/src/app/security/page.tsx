'use client'

import PublicLayout from '@/components/public/PublicLayout'

export default function SecurityPage() {
  return (
    <PublicLayout>
      <div className="bg-white py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-medium text-gray-900 mb-8">Security & Compliance</h1>
          
          <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
            <p className="text-lg text-gray-600">
              Iron Front Digital is built with security and compliance as foundational principles.
            </p>

            <section>
              <h2 className="text-2xl font-medium text-gray-900 mt-10 mb-4">Data Security</h2>
              <ul className="list-disc list-inside space-y-2 mt-4">
                <li>All data is encrypted in transit using TLS/SSL</li>
                <li>Database access is restricted and monitored</li>
                <li>Regular security audits and vulnerability assessments</li>
                <li>Access controls and role-based permissions</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-medium text-gray-900 mt-10 mb-4">Payment Security</h2>
              <p>
                Payment processing is handled by Stripe, which maintains PCI DSS Level 1 compliance. We do not store credit card numbers or sensitive payment information on our servers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-medium text-gray-900 mt-10 mb-4">Compliance</h2>
              <p>We maintain compliance with:</p>
              <ul className="list-disc list-inside space-y-2 mt-4">
                <li>Data protection regulations</li>
                <li>Financial services requirements</li>
                <li>Industry best practices for SaaS platforms</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-medium text-gray-900 mt-10 mb-4">Infrastructure</h2>
              <p>
                Our platform is hosted on secure, enterprise-grade infrastructure with redundant systems, automated backups, and 24/7 monitoring.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-medium text-gray-900 mt-10 mb-4">Reporting Issues</h2>
              <p>
                If you discover a security vulnerability, please report it responsibly through your account dashboard or by contacting support.
              </p>
            </section>
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}


