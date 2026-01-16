import { getCurrentUser, isOwner } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ConsoleLayout from '@/components/layout/ConsoleLayout'
import { db } from '@/lib/db'
import LogoutButton from '@/components/LogoutButton'

const INTAKE_ORG_ID = process.env.INTAKE_ORG_ID || '00000000-0000-0000-0000-000000000000'

async function getOwnerData() {
  // System Status
  const appHealth = { status: 'ok', message: 'Application running' }
  const dbHealth = { status: 'ok', message: 'Database connected' }
  
  try {
    await db.user.findFirst()
  } catch (e) {
    dbHealth.status = 'error'
    dbHealth.message = 'Database connection failed'
  }

  // Stripe readiness
  const stripeReady = !!(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTHLY)
  const stripeHealth = {
    status: stripeReady ? 'ok' : 'warning',
    message: stripeReady ? 'Stripe configured' : 'Stripe not fully configured',
  }

  // Intake Snapshot
  const intakeCounts = await db.intake.groupBy({
    by: ['status'],
    _count: true,
  })

  const intakeSnapshot = {
    new: 0,
    contacted: 0,
    qualified: 0,
    closed: 0,
    lost: 0,
    total: 0,
  }

  intakeCounts.forEach((item) => {
    intakeSnapshot[item.status as keyof typeof intakeSnapshot] = item._count
    intakeSnapshot.total += item._count
  })

  // Recent Activity
  const recentEvents = await db.event.findMany({
    where: {
      org_id: INTAKE_ORG_ID,
    },
    orderBy: {
      created_at: 'desc',
    },
    take: 10,
    select: {
      id: true,
      event_type: true,
      actor_role: true,
      created_at: true,
      metadata: true,
    },
  })

  // Revenue Signals
  const checkoutStarted = await db.event.count({
    where: {
      org_id: INTAKE_ORG_ID,
      event_type: 'checkout_started',
    },
  })

  const checkoutCompleted = await db.event.count({
    where: {
      org_id: INTAKE_ORG_ID,
      event_type: 'checkout_completed',
    },
  })

  const revenueSignals = {
    checkout_started: checkoutStarted,
    checkout_completed: checkoutCompleted,
    wired: checkoutStarted > 0 || checkoutCompleted > 0,
  }

  return {
    system_status: {
      app: appHealth,
      db: dbHealth,
      stripe: stripeHealth,
    },
    intake_snapshot: intakeSnapshot,
    recent_activity: recentEvents,
    revenue_signals: revenueSignals,
  }
}

export default async function OwnerConsolePage() {
  const user = await getCurrentUser()

  if (!user || !isOwner(user)) {
    redirect('/login')
  }

  const data = await getOwnerData()

  return (
    <ConsoleLayout title="Owner Console">
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-medium text-gray-900">Owner Console</h1>
          <p className="text-gray-600 mt-2">System status and operational overview</p>
        </div>

        {/* System Status */}
        <div className="mb-8">
          <h2 className="text-xl font-medium text-gray-900 mb-4">System Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Application</span>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    data.system_status.app.status === 'ok'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {data.system_status.app.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">{data.system_status.app.message}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Database</span>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    data.system_status.db.status === 'ok'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {data.system_status.db.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">{data.system_status.db.message}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Stripe</span>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    data.system_status.stripe.status === 'ok'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {data.system_status.stripe.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">{data.system_status.stripe.message}</p>
            </div>
          </div>
        </div>

        {/* Intake Snapshot */}
        <div className="mb-8">
          <h2 className="text-xl font-medium text-gray-900 mb-4">Intake Snapshot</h2>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div>
                <div className="text-2xl font-medium text-gray-900">{data.intake_snapshot.new}</div>
                <div className="text-sm text-gray-600">New</div>
              </div>
              <div>
                <div className="text-2xl font-medium text-gray-900">{data.intake_snapshot.contacted}</div>
                <div className="text-sm text-gray-600">Contacted</div>
              </div>
              <div>
                <div className="text-2xl font-medium text-gray-900">{data.intake_snapshot.qualified}</div>
                <div className="text-sm text-gray-600">Qualified</div>
              </div>
              <div>
                <div className="text-2xl font-medium text-gray-900">{data.intake_snapshot.closed}</div>
                <div className="text-sm text-gray-600">Closed</div>
              </div>
              <div>
                <div className="text-2xl font-medium text-gray-900">{data.intake_snapshot.lost}</div>
                <div className="text-sm text-gray-600">Lost</div>
              </div>
              <div>
                <div className="text-2xl font-medium text-gray-900">{data.intake_snapshot.total}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mb-8">
          <h2 className="text-xl font-medium text-gray-900 mb-4">Recent Activity</h2>
          {data.recent_activity.length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.recent_activity.map((event: any) => (
                    <tr key={event.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{event.event_type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{event.actor_role}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(event.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-6 text-gray-500">No recent activity</div>
          )}
        </div>

        {/* Revenue Signals */}
        <div>
          <h2 className="text-xl font-medium text-gray-900 mb-4">Revenue Signals</h2>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-2xl font-medium text-gray-900">{data.revenue_signals.checkout_started}</div>
                <div className="text-sm text-gray-600">Checkout Started</div>
              </div>
              <div>
                <div className="text-2xl font-medium text-gray-900">{data.revenue_signals.checkout_completed}</div>
                <div className="text-sm text-gray-600">Checkout Completed</div>
              </div>
              <div>
                <div className="text-2xl font-medium text-gray-900">
                  {data.revenue_signals.wired ? '✓' : '—'}
                </div>
                <div className="text-sm text-gray-600">Wired</div>
              </div>
            </div>
            {!data.revenue_signals.wired && (
              <p className="text-xs text-gray-500 mt-4">TODO: Wire checkout events</p>
            )}
          </div>
        </div>

        {/* Logout */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <LogoutButton />
        </div>
      </div>
    </ConsoleLayout>
  )
}
