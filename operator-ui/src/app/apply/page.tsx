'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import PublicLayout from '@/components/public/PublicLayout'

export default function ApplyPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [intent, setIntent] = useState<string>('')
  const [tier, setTier] = useState<string>('')
  const [paid, setPaid] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [orgType, setOrgType] = useState<string>('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const intentParam = searchParams.get('intent') || ''
    const tierParam = searchParams.get('tier') || ''
    const paidParam = searchParams.get('paid') === 'true'
    
    setIntent(intentParam)
    setTier(tierParam)
    setPaid(paidParam)
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const response = await fetch('/api/public/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          intent: intent || 'scale', // Default to scale if not set
          tier,
          preferences: {
            org_type: orgType,
            description,
            paid: paid,
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit application')
      }

      // Route to complete page
      router.push('/apply/complete')
    } catch (error) {
      console.error('Application error:', error)
      alert('There was an error submitting your application. Please try again.')
      setSubmitting(false)
    }
  }

  // Determine if this is ecosystem entry
  const isEcosystem = intent === 'ecosystems'

  return (
    <PublicLayout>
      <div className="bg-white py-20 sm:py-24">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <h1 className="text-3xl sm:text-4xl font-medium text-gray-900 mb-4">
              Apply for Platform Access
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              Iron Front Digital is designed for serious operators and organizations. Applications help ensure alignment, compliance, and appropriate platform use.
            </p>
          </div>

          {/* Ecosystem Entry Program Copy Block */}
          {isEcosystem && (
            <div className="bg-gray-50 border-l-4 border-gray-400 p-6 sm:p-8 mb-10">
              <h2 className="text-lg sm:text-xl font-medium text-gray-900 mb-4">
                Ecosystem Entry Program
              </h2>
              <div className="space-y-3 text-sm sm:text-base text-gray-700 leading-relaxed">
                <p>
                  Participation in operating environments is optional and independent.
                </p>
                <p>
                  Access is never guaranteed and is subject to alignment and capacity.
                </p>
                <p>
                  Iron Front Digital is a platform infrastructure provider, not a business opportunity.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-7">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-red-600">*</span>
              </label>
              <input
                type="email"
                id="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            {/* Hidden intent field if already known */}
            {intent && (
              <input type="hidden" name="intent" value={intent} />
            )}

            {/* Organization type (for scale/leader/franchise) */}
            {(intent === 'scale' || !intent) && (
              <div>
                <label htmlFor="orgType" className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Type
                </label>
                <select
                  id="orgType"
                  value={orgType}
                  onChange={(e) => setOrgType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">Select...</option>
                  <option value="individual">Individual Operator</option>
                  <option value="leader">Organization Leader</option>
                  <option value="company">Company Owner</option>
                </select>
              </div>
            )}

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Briefly describe what you're building or managing.
              </label>
              <textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="A brief description helps us understand your needs..."
              />
            </div>

            {/* Show paid indicator if coming from checkout */}
            {paid && (
              <div className="bg-green-50 border border-green-200 rounded-md p-5">
                <p className="text-sm text-green-800 leading-relaxed">
                  ✓ Payment processed. Your account will be provisioned within 24 hours.
                </p>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-6 py-3 bg-gray-900 text-white rounded-md text-base font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : paid ? 'Continue Application' : 'Submit Application'}
              </button>
            </div>

            <p className="text-sm text-gray-500 text-center pt-2">
              Our team will review your application and follow up within 1–2 business days.
            </p>
          </form>
        </div>
      </div>
    </PublicLayout>
  )
}
