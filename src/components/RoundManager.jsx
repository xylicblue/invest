import { useState, useEffect, useRef } from 'react'
import { gameApi, subscriptions } from '../lib/supabase'

export default function RoundManager({ gameId, isAdmin = false }) {
  const [game, setGame] = useState(null)
  const [rounds, setRounds] = useState([])
  const [currentPrices, setCurrentPrices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [advancing, setAdvancing] = useState(false)
  const [autoAdvancing, setAutoAdvancing] = useState(false)
  const countdownIntervalRef = useRef(null)
  const autoAdvanceTimeoutRef = useRef(null)

  useEffect(() => {
    loadGameData()

    // Subscribe to real-time updates
    const gamesChannel = subscriptions.subscribeToGames(() => {
      loadGameData()
    })

    const roundsChannel = subscriptions.subscribeToRounds(gameId, () => {
      loadRounds()
    })

    return () => {
      gamesChannel.unsubscribe()
      roundsChannel.unsubscribe()
    }
  }, [gameId])

  // Timer effect
  useEffect(() => {
    const clearCountdown = () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
        countdownIntervalRef.current = null
      }
    }

    const clearAutoAdvanceTimeout = () => {
      if (autoAdvanceTimeoutRef.current) {
        clearTimeout(autoAdvanceTimeoutRef.current)
        autoAdvanceTimeoutRef.current = null
      }
    }

    clearCountdown()

    if (!game || game.status !== 'live') {
      setAutoAdvancing(false)
      setTimeRemaining(0)
      clearAutoAdvanceTimeout()
      return
    }

    const currentRound = rounds.find(r => r.round_number === game.current_round_number)
    if (!currentRound || currentRound.status !== 'active') {
      setAutoAdvancing(false)
      setTimeRemaining(0)
      clearAutoAdvanceTimeout()
      return
    }

    const calculateTimeRemaining = () => {
      if (!currentRound.actual_start_time) return 0

      const startTime = new Date(currentRound.actual_start_time).getTime()
      const durationMs = Number(currentRound.duration_minutes || 0) * 60 * 1000

      if (!Number.isFinite(startTime) || durationMs <= 0) {
        return 0
      }

      const endTime = startTime + durationMs
      const now = Date.now()
      const remaining = Math.max(0, endTime - now)
      return Math.floor(remaining / 1000)
    }

    const triggerAutoAdvance = () => {
      if (!isAdmin) return

      if (autoAdvanceTimeoutRef.current) return

      setAutoAdvancing(true)
      autoAdvanceTimeoutRef.current = setTimeout(async () => {
        try {
          await gameApi.advanceToNextRound(gameId)
        } catch (err) {
          console.error('Error auto-advancing round:', err)
          console.error('Full error details:', JSON.stringify(err, null, 2))
          alert(`Failed to advance round: ${err.message || 'Unknown error'}`)
          setAutoAdvancing(false)
        } finally {
          autoAdvanceTimeoutRef.current = null
        }
      }, 3000)
    }

    const initialRemaining = calculateTimeRemaining()
    const safeInitialRemaining = Number.isFinite(initialRemaining) ? initialRemaining : 0

    if (safeInitialRemaining > 0) {
      setAutoAdvancing(false)
    }

    setTimeRemaining(safeInitialRemaining)

    if (!Number.isFinite(initialRemaining) || initialRemaining <= 0) {
      triggerAutoAdvance()
    }

    countdownIntervalRef.current = setInterval(() => {
      const remaining = calculateTimeRemaining()
      const safeRemaining = Number.isFinite(remaining) ? remaining : 0
      setTimeRemaining(safeRemaining)

      if (!Number.isFinite(remaining) || remaining <= 0) {
        clearCountdown()
        triggerAutoAdvance()
      }
    }, 1000)

    return () => {
      clearCountdown()
      clearAutoAdvanceTimeout()
    }
  }, [game, rounds, gameId, isAdmin])

  const loadGameData = async () => {
    try {
      const { data: gameData, error: gameError } = await gameApi.getGameById(gameId)
      if (gameError) throw gameError

      setGame(gameData)
      await loadRounds()
      await loadCurrentPrices(gameData.current_round_number)
    } catch (err) {
      console.error('Error loading game data:', err)
      setError('Failed to load game data')
    } finally {
      setLoading(false)
    }
  }

  const loadRounds = async () => {
    try {
      const { data, error } = await gameApi.getRounds(gameId)
      if (error) throw error
      setRounds(data || [])
    } catch (err) {
      console.error('Error loading rounds:', err)
    }
  }

  const loadCurrentPrices = async (roundNumber) => {
    if (!roundNumber) return
    try {
      const { data, error } = await gameApi.getRoundPrices(gameId, roundNumber)
      if (error) throw error
      setCurrentPrices(data || [])
    } catch (err) {
      console.error('Error loading prices:', err)
    }
  }

  const handleAdvanceRound = async () => {
    if (!isAdmin) return

    setAdvancing(true)
    try {
      const { error } = await gameApi.advanceToNextRound(gameId)
      if (error) throw error
      await loadGameData()
    } catch (err) {
      console.error('Error advancing round:', err)
      alert(err.message || 'Failed to advance round')
    } finally {
      setAdvancing(false)
    }
  }

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`
  }

  const getTimerColor = () => {
    if (timeRemaining > 300) return 'text-green-400' // > 5 minutes
    if (timeRemaining > 60) return 'text-yellow-400' // > 1 minute
    return 'text-red-400' // < 1 minute or expired
  }

  const getRoundStatusBadge = (round) => {
    const statusStyles = {
      pending: 'bg-gray-500/20 text-gray-300 ring-gray-500/30',
      active: 'bg-green-500/20 text-green-400 ring-green-500/30',
      completed: 'bg-blue-500/20 text-blue-400 ring-blue-500/30',
    }

    return (
      <div className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusStyles[round.status] || statusStyles.pending}`}>
        {round.status.charAt(0).toUpperCase() + round.status.slice(1)}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="glass-panel p-6 rounded-xl">
        <div className="text-center text-white/60">Loading round manager...</div>
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

  if (!game) {
    return (
      <div className="glass-panel p-6 rounded-xl">
        <div className="text-center text-white/60">Game not found</div>
      </div>
    )
  }

  const currentRound = rounds.find(r => r.round_number === game.current_round_number)
  const isRoundActive = currentRound?.status === 'active'
  const canAdvance = isAdmin && game.status === 'live' && game.current_round_number < game.total_rounds

  return (
    <div className="space-y-6">
      {/* Game Status Header */}
      <div className="glass-panel rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">{game.title}</h2>
            <div className="flex items-center gap-3">
              <span className="text-white/60 text-sm">
                Round {game.current_round_number || 0} of {game.total_rounds}
              </span>
              <div className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${
                game.status === 'live' ? 'bg-green-500/20 text-green-400 ring-green-500/30' : 'bg-gray-500/20 text-gray-300 ring-gray-500/30'
              }`}>
                {game.status.charAt(0).toUpperCase() + game.status.slice(1)}
              </div>
            </div>
          </div>

          {isAdmin && canAdvance && (
            <button
              onClick={handleAdvanceRound}
              disabled={advancing || isRoundActive}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all ${
                isRoundActive
                  ? 'bg-white/5 text-white/40 cursor-not-allowed'
                  : 'bg-gradient-primary text-white hover:opacity-90'
              }`}
            >
              <span className="material-symbols-outlined text-base">
                {advancing ? 'hourglass_empty' : 'skip_next'}
              </span>
              {advancing ? 'Advancing...' : 'Advance to Next Round'}
            </button>
          )}
        </div>

        {/* Live Timer */}
        {isRoundActive && !autoAdvancing && (
          <div className="flex items-center justify-center gap-3 p-6 bg-black/20 rounded-lg border border-white/10">
            <span className="material-symbols-outlined text-3xl text-white/60">timer</span>
            <div className="text-center">
              <div className={`text-5xl font-bold font-mono ${getTimerColor()}`}>
                {formatTime(timeRemaining)}
              </div>
              <div className="text-white/60 text-sm mt-1">Time Remaining</div>
            </div>
          </div>
        )}

        {/* Auto-advancing Message */}
        {autoAdvancing && (
          <div className="flex items-center justify-center gap-3 p-6 bg-[#FF00A8]/10 rounded-lg border border-[#FF00A8]/30">
            <span className="material-symbols-outlined text-3xl text-[#FF00A8] animate-pulse">
              fast_forward
            </span>
            <div className="text-center">
              <div className="text-xl font-bold text-white">Round Complete!</div>
              <div className="text-white/60 text-sm mt-1">
                {isAdmin ? 'Advancing to next round in 3 seconds...' : 'Waiting for round to advance...'}
              </div>
            </div>
          </div>
        )}

        {/* Round Ended - Waiting for Admin */}
        {!isRoundActive && !autoAdvancing && game.status === 'live' && timeRemaining === 0 && !isAdmin && (
          <div className="flex items-center justify-center gap-3 p-6 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
            <span className="material-symbols-outlined text-3xl text-yellow-400">schedule</span>
            <div className="text-center">
              <div className="text-xl font-bold text-white">Round Complete</div>
              <div className="text-white/60 text-sm mt-1">
                Waiting for admin to advance to next round...
              </div>
            </div>
          </div>
        )}

        {!isRoundActive && !autoAdvancing && game.status === 'live' && (timeRemaining !== 0 || isAdmin) && (
          <div className="flex items-center justify-center gap-3 p-6 bg-black/20 rounded-lg border border-white/10">
            <span className="material-symbols-outlined text-3xl text-yellow-400">schedule</span>
            <div className="text-center">
              <div className="text-xl font-bold text-white">Round Not Active</div>
              <div className="text-white/60 text-sm mt-1">
                {isAdmin ? 'Click "Advance to Next Round" to continue' : 'Waiting for admin to start next round'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Current Round Prices */}
      {currentPrices.length > 0 && (
        <div className="glass-panel rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 p-6 border-b border-white/10">
            <span className="material-symbols-outlined text-2xl text-[#FF00A8]">
              show_chart
            </span>
            <h3 className="text-xl font-bold text-white">Current Stock Prices</h3>
            <span className="ml-auto text-white/60 text-sm">
              Round {game.current_round_number}
            </span>
          </div>

          <div className="divide-y divide-white/5">
            {currentPrices.map((price) => (
              <div
                key={price.stock_id || price.symbol}
                className="grid grid-cols-[1fr_auto] gap-4 px-6 py-4 items-center hover:bg-white/5 transition-colors"
              >
                <div>
                  <div className="text-white font-bold text-lg">{price.stock_symbol}</div>
                  <div className="text-white/60 text-sm">{price.stock_name}</div>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold text-2xl font-mono">
                    ${price.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Round Timeline */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 p-6 border-b border-white/10">
          <span className="material-symbols-outlined text-2xl text-[#FF00A8]">
            timeline
          </span>
          <h3 className="text-xl font-bold text-white">Round Timeline</h3>
        </div>

        <div className="p-6">
          <div className="space-y-3">
            {rounds.map((round) => {
              const isCurrent = round.round_number === game.current_round_number
              const isPast = round.round_number < game.current_round_number

              return (
                <div
                  key={round.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                    isCurrent
                      ? 'bg-[#FF00A8]/10 border-[#FF00A8]/30'
                      : isPast
                      ? 'bg-white/5 border-white/10 opacity-60'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  {/* Round Number Badge */}
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full font-bold ${
                    isCurrent
                      ? 'bg-gradient-to-br from-[#FF00A8] to-[#FF6F00] text-white'
                      : isPast
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-white/10 text-white/60'
                  }`}>
                    {round.round_number}
                  </div>

                  {/* Round Details */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-semibold">Round {round.round_number}</span>
                      {getRoundStatusBadge(round)}
                      {isCurrent && (
                        <span className="text-xs px-2 py-0.5 rounded bg-[#FF00A8]/20 text-[#FF00A8]">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="text-white/60 text-sm">
                      Duration: {round.duration_minutes} minutes
                    </div>
                    {round.actual_start_time && (
                      <div className="text-white/40 text-xs mt-1">
                        Started: {new Date(round.actual_start_time).toLocaleString()}
                      </div>
                    )}
                    {round.actual_end_time && (
                      <div className="text-white/40 text-xs">
                        Ended: {new Date(round.actual_end_time).toLocaleString()}
                      </div>
                    )}
                  </div>

                  {/* Status Icon */}
                  <div>
                    {round.status === 'completed' && (
                      <span className="material-symbols-outlined text-2xl text-blue-400">
                        check_circle
                      </span>
                    )}
                    {round.status === 'active' && (
                      <span className="material-symbols-outlined text-2xl text-green-400 animate-pulse">
                        play_circle
                      </span>
                    )}
                    {round.status === 'pending' && (
                      <span className="material-symbols-outlined text-2xl text-white/40">
                        schedule
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Game Completion Message */}
      {game.status === 'completed' && (
        <div className="glass-panel rounded-xl p-8 text-center">
          <span className="material-symbols-outlined text-6xl text-[#FF00A8] mb-4 block">
            emoji_events
          </span>
          <h3 className="text-2xl font-bold text-white mb-2">Game Completed!</h3>
          <p className="text-white/60">
            All {game.total_rounds} rounds have been completed. Check the leaderboard for final rankings.
          </p>
        </div>
      )}
    </div>
  )
}
