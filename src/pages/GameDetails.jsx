import { useState, useEffect } from 'react'
import { gameApi } from '../lib/supabase'
import RoundManager from '../components/RoundManager'
import Leaderboard from '../components/Leaderboard'
import TradingInterface from '../components/TradingInterface'

export default function GameDetails({ gameId, profile, onBack }) {
  const [game, setGame] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    loadGame()
  }, [gameId])

  const loadGame = async () => {
    try {
      const { data, error } = await gameApi.getGameById(gameId)
      if (error) throw error
      setGame(data)
    } catch (err) {
      console.error('Error loading game:', err)
      setError('Failed to load game')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden bg-background-dark">
        <div className="flex items-center justify-center h-screen">
          <div className="text-white/60 text-lg">Loading game...</div>
        </div>
      </div>
    )
  }

  if (error || !game) {
    return (
      <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden bg-background-dark">
        <div className="flex flex-col items-center justify-center h-screen gap-4">
          <div className="text-red-400 text-lg">{error || 'Game not found'}</div>
          <button
            onClick={onBack}
            className="px-6 py-3 rounded-lg bg-white/10 text-white font-bold hover:bg-white/20 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const isAdmin = profile?.role === 'admin'

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden bg-background-dark">
      <div className="layout-container flex h-full grow flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 w-full glass-panel border-b-0">
          <div className="mx-auto flex max-w-7xl items-center justify-between whitespace-nowrap px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-white">arrow_back</span>
              </button>
              <div className="size-6 text-[#FF00A8]">
                <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path clipRule="evenodd" d="M39.475 21.6262C40.358 21.4363 40.6863 21.5589 40.7581 21.5934C40.7876 21.655 40.8547 21.857 40.8082 22.3336C40.7408 23.0255 40.4502 24.0046 39.8572 25.2301C38.6799 27.6631 36.5085 30.6631 33.5858 33.5858C30.6631 36.5085 27.6632 38.6799 25.2301 39.8572C24.0046 40.4502 23.0255 40.7407 22.3336 40.8082C21.8571 40.8547 21.6551 40.7875 21.5934 40.7581C21.5589 40.6863 21.4363 40.358 21.6262 39.475C21.8562 38.4054 22.4689 36.9657 23.5038 35.2817C24.7575 33.2417 26.5497 30.9744 28.7621 28.762C30.9744 26.5497 33.2417 24.7574 35.2817 23.5037C36.9657 22.4689 38.4054 21.8562 39.475 21.6262ZM4.41189 29.2403L18.7597 43.5881C19.8813 44.7097 21.4027 44.9179 22.7217 44.7893C24.0585 44.659 25.5148 44.1631 26.9723 43.4579C29.9052 42.0387 33.2618 39.5667 36.4142 36.4142C39.5667 33.2618 42.0387 29.9052 43.4579 26.9723C44.1631 25.5148 44.659 24.0585 44.7893 22.7217C44.9179 21.4027 44.7097 19.8813 43.5881 18.7597L29.2403 4.41187C27.8527 3.02428 25.8765 3.02573 24.2861 3.36776C22.6081 3.72863 20.7334 4.58419 18.8396 5.74801C16.4978 7.18716 13.9881 9.18353 11.5858 11.5858C9.18354 13.988 7.18717 16.4978 5.74802 18.8396C4.58421 20.7334 3.72865 22.6081 3.36778 24.2861C3.02574 25.8765 3.02429 27.8527 4.41189 29.2403Z" fill="currentColor" fillRule="evenodd"></path>
                </svg>
              </div>
              <h1 className="text-xl font-extrabold tracking-tight text-gradient">
                {game.title}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-sm text-white/80">
                <span className="font-semibold text-white">{profile?.username}</span>
                <span className="mx-2 text-white/40">·</span>
                <span className="text-white/60">{isAdmin ? 'Admin' : 'Player'}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 mb-6 p-1 bg-white/5 rounded-lg border border-white/10 w-fit">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'overview'
                  ? 'bg-gradient-primary text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              Overview
            </button>
            {!isAdmin && game?.status === 'live' && (
              <button
                onClick={() => setActiveTab('trading')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'trading'
                    ? 'bg-gradient-primary text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                Trading
              </button>
            )}
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'leaderboard'
                  ? 'bg-gradient-primary text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              Leaderboard
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('manage')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'manage'
                    ? 'bg-gradient-primary text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                Manage
              </button>
            )}
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Game Info Card */}
              <div className="glass-panel rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">Game Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-white/60 text-sm mb-1">Description</div>
                    <div className="text-white">{game.description || 'No description provided'}</div>
                  </div>
                  <div>
                    <div className="text-white/60 text-sm mb-1">Status</div>
                    <div className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${
                      game.status === 'live'
                        ? 'bg-green-500/20 text-green-400 ring-green-500/30'
                        : game.status === 'completed'
                        ? 'bg-blue-500/20 text-blue-400 ring-blue-500/30'
                        : 'bg-gray-500/20 text-gray-300 ring-gray-500/30'
                    }`}>
                      {game.status.charAt(0).toUpperCase() + game.status.slice(1)}
                    </div>
                  </div>
                  <div>
                    <div className="text-white/60 text-sm mb-1">Initial Cash</div>
                    <div className="text-white font-semibold text-lg">
                      ${game.initial_cash?.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-white/60 text-sm mb-1">Total Rounds</div>
                    <div className="text-white font-semibold text-lg">{game.total_rounds}</div>
                  </div>
                  <div>
                    <div className="text-white/60 text-sm mb-1">Short Selling</div>
                    <div className="text-white">
                      {game.allow_short ? (
                        <span className="text-green-400">Allowed</span>
                      ) : (
                        <span className="text-red-400">Not Allowed</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-white/60 text-sm mb-1">Created</div>
                    <div className="text-white">{new Date(game.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>

              {/* Round Manager */}
              <RoundManager gameId={gameId} isAdmin={isAdmin} />
            </div>
          )}

          {activeTab === 'trading' && !isAdmin && (
            <TradingInterface gameId={gameId} playerId={profile?.id} />
          )}

          {activeTab === 'leaderboard' && (
            <Leaderboard gameId={gameId} currentUserId={profile?.id} />
          )}

          {activeTab === 'manage' && isAdmin && (
            <RoundManager gameId={gameId} isAdmin={true} />
          )}
        </main>
      </div>
    </div>
  )
}
