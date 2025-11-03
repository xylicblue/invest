import { useState, useEffect } from 'react'
import { gameApi, subscriptions } from '../lib/supabase'
import GameEditor from '../components/GameEditor'
import GameDetails from './GameDetails'

export default function AdminDashboard({ profile, onLogout }) {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateGame, setShowCreateGame] = useState(false)
  const [selectedGameId, setSelectedGameId] = useState(null)

  useEffect(() => {
    loadGames()

    // Subscribe to real-time game updates
    const channel = subscriptions.subscribeToGames(() => {
      loadGames()
    })

    return () => {
      channel.unsubscribe()
    }
  }, [])

  const loadGames = async () => {
    try {
      const { data, error } = await gameApi.getGames()
      if (error) throw error
      setGames(data || [])
    } catch (err) {
      console.error('Error loading games:', err)
      setError('Failed to load games')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    setLoading(true)
    loadGames()
  }

  const handleDeleteGame = async (gameId, gameTitle) => {
    if (!confirm(`Are you sure you want to delete "${gameTitle}"? This action cannot be undone.`)) {
      return
    }

    try {
      await gameApi.deleteGame(gameId)
      alert('Game deleted successfully')
      loadGames()
    } catch (err) {
      console.error('Error deleting game:', err)
      alert(err.message || 'Failed to delete game')
    }
  }

  const getStatusBadge = (status) => {
    const statusStyles = {
      draft: 'bg-gray-500/20 text-gray-300 ring-gray-500/30',
      live: 'bg-green-500/20 text-green-400 ring-green-500/30',
      completed: 'bg-blue-500/20 text-blue-400 ring-blue-500/30',
      archived: 'bg-gray-600/20 text-gray-400 ring-gray-600/30',
    }

    return (
      <div className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${statusStyles[status] || statusStyles.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </div>
    )
  }

  // If viewing game details, show GameDetails component
  if (selectedGameId) {
    return (
      <GameDetails
        gameId={selectedGameId}
        profile={profile}
        onBack={() => setSelectedGameId(null)}
      />
    )
  }

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden bg-background-dark">
      <div className="layout-container flex h-full grow flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 w-full glass-panel border-b-0">
          <div className="mx-auto flex max-w-7xl items-center justify-between whitespace-nowrap px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <div className="size-6 text-[#FF00A8]">
                <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path clipRule="evenodd" d="M39.475 21.6262C40.358 21.4363 40.6863 21.5589 40.7581 21.5934C40.7876 21.655 40.8547 21.857 40.8082 22.3336C40.7408 23.0255 40.4502 24.0046 39.8572 25.2301C38.6799 27.6631 36.5085 30.6631 33.5858 33.5858C30.6631 36.5085 27.6632 38.6799 25.2301 39.8572C24.0046 40.4502 23.0255 40.7407 22.3336 40.8082C21.8571 40.8547 21.6551 40.7875 21.5934 40.7581C21.5589 40.6863 21.4363 40.358 21.6262 39.475C21.8562 38.4054 22.4689 36.9657 23.5038 35.2817C24.7575 33.2417 26.5497 30.9744 28.7621 28.762C30.9744 26.5497 33.2417 24.7574 35.2817 23.5037C36.9657 22.4689 38.4054 21.8562 39.475 21.6262ZM4.41189 29.2403L18.7597 43.5881C19.8813 44.7097 21.4027 44.9179 22.7217 44.7893C24.0585 44.659 25.5148 44.1631 26.9723 43.4579C29.9052 42.0387 33.2618 39.5667 36.4142 36.4142C39.5667 33.2618 42.0387 29.9052 43.4579 26.9723C44.1631 25.5148 44.659 24.0585 44.7893 22.7217C44.9179 21.4027 44.7097 19.8813 43.5881 18.7597L29.2403 4.41187C27.8527 3.02428 25.8765 3.02573 24.2861 3.36776C22.6081 3.72863 20.7334 4.58419 18.8396 5.74801C16.4978 7.18716 13.9881 9.18353 11.5858 11.5858C9.18354 13.988 7.18717 16.4978 5.74802 18.8396C4.58421 20.7334 3.72865 22.6081 3.36778 24.2861C3.02574 25.8765 3.02429 27.8527 4.41189 29.2403Z" fill="currentColor" fillRule="evenodd"></path>
                </svg>
              </div>
              <h1 className="text-xl font-extrabold tracking-tight text-gradient">
                Investomania Admin Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-sm text-white/80">
                <span className="font-semibold text-white">{profile?.username}</span>
                <span className="mx-2 text-white/40">·</span>
                <span className="text-white/60">Admin</span>
              </div>
              <button
                onClick={onLogout}
                className="flex min-w-fit cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-10 px-4 text-[#F0F0F0] text-sm font-bold leading-normal tracking-[0.015em] hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-base">logout</span>
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <h2 className="text-2xl font-bold text-white">Active Games</h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowCreateGame(true)}
                className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-10 px-4 bg-gradient-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:opacity-90 transition-opacity"
              >
                <span className="material-symbols-outlined text-base">add</span>
                <span className="truncate">Create New Game</span>
              </button>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-10 px-4 bg-white/10 text-white text-sm font-bold leading-normal tracking-[0.015em] border border-white/20 hover:bg-white/20 transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base">refresh</span>
                <span className="truncate">Refresh</span>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-red-400 text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading && games.length === 0 && (
            <div className="flex items-center justify-center py-20">
              <div className="text-white/60 text-lg">Loading games...</div>
            </div>
          )}

          {/* Empty State */}
          {!loading && games.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="glass-panel p-12 rounded-xl text-center max-w-md">
                <div className="text-white/40 mb-4">
                  <span className="material-symbols-outlined" style={{ fontSize: '64px' }}>
                    sports_esports
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No Games Yet</h3>
                <p className="text-white/60 mb-6">
                  Create your first trading game to get started!
                </p>
                <button
                  onClick={() => setShowCreateGame(true)}
                  className="bg-gradient-primary text-white font-bold py-3 px-6 rounded-lg hover:brightness-110 transition-all"
                >
                  Create Game
                </button>
              </div>
            </div>
          )}

          {/* Game Grid */}
          {games.length > 0 && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
              {games.map((game) => (
                <div
                  key={game.id}
                  className="flex flex-col gap-4 rounded-xl p-5 glass-panel hover:border-white/20 transition-all cursor-pointer"
                  onClick={() => setSelectedGameId(game.id)}
                >
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="text-white text-lg font-bold leading-tight flex-1">
                      {game.title}
                    </h3>
                    {getStatusBadge(game.status)}
                  </div>

                  {game.description && (
                    <p className="text-white/60 text-sm line-clamp-2">
                      {game.description}
                    </p>
                  )}

                  <div className="flex flex-col gap-2 text-sm">
                    <div className="flex justify-between text-white/80">
                      <span className="text-white/60">Initial Cash:</span>
                      <span className="font-semibold">${game.initial_cash?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-white/80">
                      <span className="text-white/60">Total Rounds:</span>
                      <span className="font-semibold">{game.total_rounds}</span>
                    </div>
                    <div className="flex justify-between text-white/80">
                      <span className="text-white/60">Current Round:</span>
                      <span className="font-semibold">
                        {game.current_round_number || 'Not Started'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10">
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        {game.status === 'draft' && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                // TODO: Open edit modal
                              }}
                              className="flex-1 py-2 px-3 rounded-lg bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                gameApi.startGame(game.id).then(() => loadGames())
                              }}
                              className="flex-1 py-2 px-3 rounded-lg bg-gradient-primary text-white text-xs font-medium hover:opacity-90 transition-opacity"
                            >
                              Start Game
                            </button>
                          </>
                        )}
                        {game.status === 'live' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedGameId(game.id)
                            }}
                            className="flex-1 py-2 px-3 rounded-lg bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-colors"
                          >
                            Manage
                          </button>
                        )}
                        {game.status === 'completed' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedGameId(game.id)
                            }}
                            className="flex-1 py-2 px-3 rounded-lg bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-colors"
                          >
                            View Results
                          </button>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteGame(game.id, game.title)
                        }}
                        className="w-full py-2 px-3 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/30 transition-colors border border-red-500/30"
                      >
                        Delete Game
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-white/40">
                    Created {new Date(game.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Game Editor Modal */}
      {showCreateGame && (
        <GameEditor
          onClose={() => setShowCreateGame(false)}
          onSave={() => {
            setShowCreateGame(false)
            loadGames()
          }}
        />
      )}
    </div>
  )
}
