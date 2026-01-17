'use client'

import PublicLayout from '@/components/public/PublicLayout'

export default function TermsPage() {
  return (
    <PublicLayout>
      <div className="bg-white py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-medium text-gray-900 mb-8">Terms of Service</h1>
          
          <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
            <p className="text-lg text-gray-600">
              These terms govern your use of Iron Front Digital. By using our platform, you agree to these terms.
            </p>

            <section>
              <h2 className="text-2xl font-medium text-gray-900 mt-10 mb-4">What We Provide</h2>
              <p>
                Iron Front Digital provides operational software and infrastructure for business operations. This includes:
              </p>
              <ul className="list-disc list-inside space-y-2 mt-4">
                <li>Platform access and tools</li>
                <li>Operational dashboards and visibility</li>
                <li>Automation and workflow systems</li>
                <li>Support and documentation</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-medium text-gray-900 mt-10 mb-4">No Guarantees</h2>
              <p>
                We do not guarantee business outcomes, income, or results. Success depends on your execution, market conditions, and external factors beyond our control.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-medium text-gray-900 mt-10 mb-4">Your Responsibilities</h2>
              <p>You are responsible for:</p>
              <ul className="list-disc list-inside space-y-2 mt-4">
                <li>Your business decisions and actions</li>
                <li>Compliance with all applicable laws and regulations</li>
                <li>The accuracy of information you provide</li>
                <li>Your communications and interactions with others</li>
                <li>Maintaining the security of your account credentials</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-medium text-gray-900 mt-10 mb-4">What We Are Not</h2>
              <p>Iron Front Digital is:</p>
              <ul className="list-disc list-inside space-y-2 mt-4">
                <li><strong>Not an MLM:</strong> We do not operate a multi-level marketing structure</li>
                <li><strong>Not a financial advisor:</strong> We do not provide financial, investment, or tax advice</li>
                <li><strong>Not a business opportunity provider:</strong> We provide tools and infrastructure, not business opportunities</li>
                <li><strong>Not responsible for outcomes:</strong> We are not responsible for your business results or decisions</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-medium text-gray-900 mt-10 mb-4">Payment Terms</h2>
              <p>
                Subscriptions are billed according to your selected plan. Annual plans are billed upfront. Payments are processed securely through Stripe. Refunds are handled on a case-by-case basis.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-medium text-gray-900 mt-10 mb-4">Account Termination</h2>
              <p>
                We reserve the right to suspend or terminate accounts that violate these terms, engage in fraudulent activity, or misuse the platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-medium text-gray-900 mt-10 mb-4">Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, Iron Front Digital is not liable for indirect, incidental, or consequential damages arising from your use of the platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-medium text-gray-900 mt-10 mb-4">Changes to Terms</h2>
              <p>
                We may update these terms from time to time. Continued use of the platform after changes constitutes acceptance of the updated terms.
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






