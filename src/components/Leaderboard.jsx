import { useState, useEffect } from 'react'
import { gameApi, subscriptions } from '../lib/supabase'

export default function Leaderboard({ gameId, currentUserId }) {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadLeaderboard()

    // Subscribe to real-time leaderboard updates
    const channel = subscriptions.subscribeToLeaderboard(gameId, () => {
      loadLeaderboard()
    })

    return () => {
      channel.unsubscribe()
    }
  }, [gameId])

  const loadLeaderboard = async () => {
    try {
      const { data, error } = await gameApi.getLeaderboard(gameId)
      if (error) throw error
      setLeaderboard(data || [])
    } catch (err) {
      console.error('Error loading leaderboard:', err)
      setError('Failed to load leaderboard')
    } finally {
      setLoading(false)
    }
  }

  const getRankBadge = (rank) => {
    if (rank === 1) {
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-white font-bold text-sm">
          1
        </div>
      )
    } else if (rank === 2) {
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 text-white font-bold text-sm">
          2
        </div>
      )
    } else if (rank === 3) {
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white font-bold text-sm">
          3
        </div>
      )
    }
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 text-white/60 font-bold text-sm">
        {rank}
      </div>
    )
  }

  const getPnlColor = (pnl) => {
    if (pnl > 0) return 'text-green-400'
    if (pnl < 0) return 'text-red-400'
    return 'text-white/60'
  }

  if (loading) {
    return (
      <div className="glass-panel p-6 rounded-xl">
        <div className="text-center text-white/60">Loading leaderboard...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-panel p-6 rounded-xl">
        <div className="text-center text-red-400">{error}</div>
      </div>
    )
  }

  if (leaderboard.length === 0) {
    return (
      <div className="glass-panel p-6 rounded-xl">
        <div className="text-center text-white/40">
          <span className="material-symbols-outlined text-5xl mb-2 block">leaderboard</span>
          <p>No players yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-panel rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-6 border-b border-white/10">
        <span className="material-symbols-outlined text-2xl text-[#FF00A8]">
          leaderboard
        </span>
        <h2 className="text-xl font-bold text-white">Leaderboard</h2>
        <span className="ml-auto text-white/60 text-sm">
          {leaderboard.length} {leaderboard.length === 1 ? 'Player' : 'Players'}
        </span>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-6 py-3 bg-white/5 text-white/60 text-sm font-medium">
        <div className="text-center">Rank</div>
        <div>Player</div>
        <div className="text-right">Cash</div>
        <div className="text-right">Equity</div>
        <div className="text-right">Total</div>
        <div className="text-right">P&L</div>
      </div>

      {/* Leaderboard Rows */}
      <div className="divide-y divide-white/5">
        {leaderboard.map((entry) => {
          const isCurrentUser = entry.player_id === currentUserId
          const pnlColor = getPnlColor(entry.pnl)

          return (
            <div
              key={entry.player_id}
              className={`grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-6 py-4 items-center transition-colors ${
                isCurrentUser
                  ? 'bg-[#FF00A8]/10 border-l-4 border-l-[#FF00A8]'
                  : 'hover:bg-white/5'
              }`}
            >
              {/* Rank */}
              <div className="flex justify-center">
                {getRankBadge(parseInt(entry.rank))}
              </div>

              {/* Username */}
              <div>
                <div className="text-white font-semibold flex items-center gap-2">
                  {entry.username}
                  {isCurrentUser && (
                    <span className="text-xs px-2 py-0.5 rounded bg-[#FF00A8]/20 text-[#FF00A8]">
                      You
                    </span>
                  )}
                </div>
              </div>

              {/* Cash */}
              <div className="text-white/80 text-sm text-right font-mono">
                ${entry.cash?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>

              {/* Equity */}
              <div className="text-white/80 text-sm text-right font-mono">
                ${entry.equity_value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>

              {/* Total Value */}
              <div className="text-white font-semibold text-right font-mono">
                ${entry.total_value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>

              {/* P&L */}
              <div className={`text-right font-mono ${pnlColor}`}>
                <div className="font-semibold">
                  {entry.pnl >= 0 ? '+' : ''}${entry.pnl?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs">
                  ({entry.pnl_percent >= 0 ? '+' : ''}{entry.pnl_percent}%)
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-white/5 text-center text-white/40 text-xs">
        Updates in real-time
      </div>
    </div>
  )
}
