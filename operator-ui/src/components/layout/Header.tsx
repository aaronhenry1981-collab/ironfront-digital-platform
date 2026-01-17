'use client'

interface HeaderProps {
  title: string
}

export default function Header({ title }: HeaderProps) {
  // Mock system status - TODO: Wire to actual system health
  const systemStatus: 'healthy' | 'degraded' | 'down' = 'healthy'

  const statusColor = {
    healthy: 'bg-green-500',
    degraded: 'bg-yellow-500',
    down: 'bg-red-500',
  }[systemStatus]

  return (
    <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6">
      <h1 className="text-lg font-medium text-white">{title}</h1>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${statusColor}`} />
          <span className="text-sm text-gray-400">System Status</span>
        </div>
        <input
          type="search"
          placeholder="Participant lookup..."
          className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
          disabled
        />
      </div>
    </header>
  )
}






