'use client'

import PublicLayout from '@/components/public/PublicLayout'

export default function PrivacyPage() {
  return (
    <PublicLayout>
      <div className="bg-white py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-medium text-gray-900 mb-8">Privacy Policy</h1>
          
          <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
            <p className="text-lg text-gray-600">
              Iron Front Digital is committed to protecting your privacy. This policy explains what information we collect and how we use it.
            </p>

            <section>
              <h2 className="text-2xl font-medium text-gray-900 mt-10 mb-4">Information We Collect</h2>
              <p>We collect the following information:</p>
              <ul className="list-disc list-inside space-y-2 mt-4">
                <li><strong>Email address:</strong> Required for account creation and communication</li>
                <li><strong>Application data:</strong> Information you provide when applying for platform access, including name, organization type, and business description</li>
                <li><strong>Payment information:</strong> Handled securely by Stripe. We do not store credit card numbers or payment details on our servers</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-medium text-gray-900 mt-10 mb-4">How We Use Your Information</h2>
              <p>We use your information for:</p>
              <ul className="list-disc list-inside space-y-2 mt-4">
                <li>Platform operations and account management</li>
                <li>Customer support and communication</li>
                <li>Compliance and legal obligations</li>
                <li>Service improvements and analytics</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-medium text-gray-900 mt-10 mb-4">Data Sharing</h2>
              <p>We do not sell your data. We may share information only when:</p>
              <ul className="list-disc list-inside space-y-2 mt-4">
                <li>Required by law or legal process</li>
                <li>Necessary to protect our rights or prevent fraud</li>
                <li>With service providers who assist in platform operations (under strict confidentiality agreements)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-medium text-gray-900 mt-10 mb-4">Data Security</h2>
              <p>
                We implement industry-standard security measures to protect your information. Payment processing is handled by Stripe, which maintains PCI DSS Level 1 compliance.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-medium text-gray-900 mt-10 mb-4">Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc list-inside space-y-2 mt-4">
                <li>Access your personal information</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your account and data</li>
                <li>Opt out of marketing communications</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-medium text-gray-900 mt-10 mb-4">Contact</h2>
              <p>
                For privacy-related questions or requests, contact us through your account dashboard or by emailing support.
              </p>
            </section>

            <section className="mt-10 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </section>
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}


