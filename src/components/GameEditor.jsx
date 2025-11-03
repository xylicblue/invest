import { useState, useEffect } from 'react'
import { gameApi, auth } from '../lib/supabase'

export default function GameEditor({ game = null, onClose, onSave }) {
  const [activeTab, setActiveTab] = useState('basic')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Basic Info
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [initialCash, setInitialCash] = useState(10000)
  const [totalRounds, setTotalRounds] = useState(5)
  const [allowShort, setAllowShort] = useState(false)

  // Stocks
  const [stocks, setStocks] = useState([])
  const [newStockSymbol, setNewStockSymbol] = useState('')
  const [newStockName, setNewStockName] = useState('')
  const [newStockPrice, setNewStockPrice] = useState('')

  // Rounds
  const [roundDurations, setRoundDurations] = useState({})

  // Prices
  const [priceMatrix, setPriceMatrix] = useState({})

  // Load existing game data if editing
  useEffect(() => {
    if (game) {
      setTitle(game.title || '')
      setDescription(game.description || '')
      setInitialCash(game.initial_cash || 10000)
      setTotalRounds(game.total_rounds || 5)
      setAllowShort(game.allow_short || false)
      // Load stocks, rounds, and prices if available
      loadGameData()
    } else {
      // Initialize round durations for new game
      const durations = {}
      for (let i = 1; i <= totalRounds; i++) {
        durations[i] = 10 // Default 10 minutes
      }
      setRoundDurations(durations)
    }
  }, [game])

  // Update round durations when totalRounds changes
  useEffect(() => {
    const durations = { ...roundDurations }
    for (let i = 1; i <= totalRounds; i++) {
      if (!durations[i]) {
        durations[i] = 10
      }
    }
    // Remove extra rounds
    Object.keys(durations).forEach(key => {
      if (parseInt(key) > totalRounds) {
        delete durations[key]
      }
    })
    setRoundDurations(durations)
  }, [totalRounds])

  const loadGameData = async () => {
    if (!game?.id) return
    try {
      const { data, error } = await gameApi.getGame(game.id)
      if (error) throw error

      setStocks(data.stocks || [])

      // Load round durations
      const durations = {}
      data.rounds?.forEach(round => {
        durations[round.round_number] = round.duration_minutes
      })
      setRoundDurations(durations)

      // Load price matrix
      const prices = {}
      data.rounds?.forEach(round => {
        prices[round.round_number] = []
      })
      // We'll load actual prices via getRoundPrices if needed
      setPriceMatrix(prices)
    } catch (err) {
      console.error('Error loading game data:', err)
    }
  }

  const handleAddStock = () => {
    if (!newStockSymbol || !newStockName || !newStockPrice) {
      setError('Please fill in all stock fields')
      return
    }

    const price = parseFloat(newStockPrice)
    if (isNaN(price) || price <= 0) {
      setError('Invalid stock price')
      return
    }

    const stockExists = stocks.find(s => s.symbol.toUpperCase() === newStockSymbol.toUpperCase())
    if (stockExists) {
      setError('Stock symbol already exists')
      return
    }

    const newStock = {
      symbol: newStockSymbol.toUpperCase(),
      display_name: newStockName,
      initial_price: price
    }

    setStocks([...stocks, newStock])

    // Initialize prices for this stock in all rounds
    const newPrices = { ...priceMatrix }
    for (let i = 1; i <= totalRounds; i++) {
      if (!newPrices[i]) newPrices[i] = []
      newPrices[i].push({
        symbol: newStock.symbol,
        price: price
      })
    }
    setPriceMatrix(newPrices)

    // Clear inputs
    setNewStockSymbol('')
    setNewStockName('')
    setNewStockPrice('')
    setError('')
  }

  const handleRemoveStock = (symbol) => {
    setStocks(stocks.filter(s => s.symbol !== symbol))

    // Remove from price matrix
    const newPrices = { ...priceMatrix }
    Object.keys(newPrices).forEach(roundNum => {
      newPrices[roundNum] = newPrices[roundNum].filter(p => p.symbol !== symbol)
    })
    setPriceMatrix(newPrices)
  }

  const handlePriceChange = (roundNum, symbol, value) => {
    const price = parseFloat(value)
    if (isNaN(price)) return

    const newPrices = { ...priceMatrix }
    if (!newPrices[roundNum]) {
      newPrices[roundNum] = []
    }

    const existingIndex = newPrices[roundNum].findIndex(p => p.symbol === symbol)
    if (existingIndex >= 0) {
      newPrices[roundNum][existingIndex].price = price
    } else {
      newPrices[roundNum].push({ symbol, price })
    }

    setPriceMatrix(newPrices)
  }

  const getPriceForRound = (symbol, roundNum) => {
    const roundPrices = priceMatrix[roundNum] || []
    const priceObj = roundPrices.find(p => p.symbol === symbol)
    return priceObj?.price || stocks.find(s => s.symbol === symbol)?.initial_price || 0
  }

  const handleSave = async () => {
    setLoading(true)
    setError('')

    try {
      // Validation
      if (!title.trim()) {
        throw new Error('Please enter a game title')
      }
      if (stocks.length === 0) {
        throw new Error('Please add at least one stock')
      }
      if (totalRounds < 1) {
        throw new Error('Game must have at least one round')
      }

      const { user } = await auth.getCurrentUser()

      // Create or update game
      let gameId = game?.id

      if (gameId) {
        // Update existing game
        await gameApi.updateGame(gameId, {
          title,
          description,
          initial_cash: initialCash,
          total_rounds: totalRounds,
          allow_short: allowShort
        })
      } else {
        // Create new game
        const { data: newGame } = await gameApi.createGame({
          title,
          description,
          initial_cash: initialCash,
          total_rounds: totalRounds,
          allow_short: allowShort,
          status: 'draft',
          current_round_number: 0,
          created_by: user.id
        })
        gameId = newGame.id
      }

      // Add stocks (only for new games)
      if (!game?.id) {
        for (const stock of stocks) {
          await gameApi.addStockToGame(gameId, stock)
        }
      }

      // Create/update rounds
      const roundsToCreate = []
      for (let i = 1; i <= totalRounds; i++) {
        roundsToCreate.push({
          game_id: gameId,
          round_number: i,
          duration_minutes: roundDurations[i] || 10,
          status: 'pending'
        })
      }
      await gameApi.createRounds(roundsToCreate)

      // Set round prices
      for (let roundNum = 1; roundNum <= totalRounds; roundNum++) {
        const prices = stocks.map(stock => ({
          symbol: stock.symbol,
          price: getPriceForRound(stock.symbol, roundNum)
        }))
        await gameApi.setRoundPrices(gameId, roundNum, prices)
      }

      if (onSave) onSave()
      if (onClose) onClose()
    } catch (err) {
      console.error('Error saving game:', err)
      setError(err.message || 'Failed to save game')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: 'info' },
    { id: 'stocks', label: 'Stocks', icon: 'candlestick_chart' },
    { id: 'rounds', label: 'Rounds', icon: 'schedule' },
    { id: 'prices', label: 'Prices', icon: 'monitoring' }
  ]

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="glass-panel rounded-xl w-full max-w-4xl my-8 bg-[#1a1a1a]/95">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white">
            {game ? 'Edit Game' : 'Create New Game'}
          </h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 px-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#FF00A8] text-white'
                  : 'border-transparent text-white/60 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-base">{tab.icon}</span>
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <p className="text-red-400 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Tab Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* BASIC INFO TAB */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Game Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#FF00A8]/50"
                  placeholder="Enter game title"
                />
              </div>

              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#FF00A8]/50"
                  placeholder="Enter game description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Initial Cash *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60">$</span>
                    <input
                      type="number"
                      value={initialCash}
                      onChange={(e) => setInitialCash(parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-[#FF00A8]/50"
                      min="0"
                      step="1000"
                    />
                  </div>
                  <p className="text-white/40 text-xs mt-1">Starting balance for each player</p>
                </div>

                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Total Rounds *
                  </label>
                  <input
                    type="number"
                    value={totalRounds}
                    onChange={(e) => {
                      const rounds = parseInt(e.target.value) || 1
                      setTotalRounds(Math.max(1, Math.min(20, rounds)))
                    }}
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-[#FF00A8]/50"
                    min="1"
                    max="20"
                  />
                  <p className="text-white/40 text-xs mt-1">Number of trading rounds (1-20)</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="allowShort"
                  checked={allowShort}
                  onChange={(e) => setAllowShort(e.target.checked)}
                  className="w-5 h-5 rounded bg-white/5 border-white/10 text-[#FF00A8] focus:ring-2 focus:ring-[#FF00A8]/50"
                />
                <label htmlFor="allowShort" className="text-white/80 text-sm font-medium cursor-pointer">
                  Allow Short Selling
                </label>
              </div>
            </div>
          )}

          {/* STOCKS TAB */}
          {activeTab === 'stocks' && (
            <div className="space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-4">Add Stock</h3>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <input
                    type="text"
                    value={newStockSymbol}
                    onChange={(e) => setNewStockSymbol(e.target.value.toUpperCase())}
                    className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#FF00A8]/50"
                    placeholder="Symbol (e.g., AAPL)"
                  />
                  <input
                    type="text"
                    value={newStockName}
                    onChange={(e) => setNewStockName(e.target.value)}
                    className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#FF00A8]/50"
                    placeholder="Company Name"
                  />
                  <input
                    type="number"
                    value={newStockPrice}
                    onChange={(e) => setNewStockPrice(e.target.value)}
                    className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#FF00A8]/50"
                    placeholder="Initial Price"
                    step="0.01"
                  />
                </div>
                <button
                  onClick={handleAddStock}
                  className="w-full py-2 px-4 rounded-lg bg-gradient-primary text-white font-medium hover:opacity-90 transition-opacity"
                >
                  Add Stock
                </button>
              </div>

              <div className="space-y-2">
                <h3 className="text-white font-semibold mb-3">Stocks ({stocks.length})</h3>
                {stocks.length === 0 ? (
                  <div className="text-center py-8 text-white/40">
                    No stocks added yet
                  </div>
                ) : (
                  stocks.map(stock => (
                    <div
                      key={stock.symbol}
                      className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10"
                    >
                      <div>
                        <div className="text-white font-semibold">{stock.symbol}</div>
                        <div className="text-white/60 text-sm">{stock.display_name}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-white font-medium">
                          ${stock.initial_price.toFixed(2)}
                        </div>
                        <button
                          onClick={() => handleRemoveStock(stock.symbol)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <span className="material-symbols-outlined text-xl">delete</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ROUNDS TAB */}
          {activeTab === 'rounds' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">Round Durations</h3>
                <p className="text-white/60 text-sm">{totalRounds} round{totalRounds > 1 ? 's' : ''}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4">
                <p className="text-white/80 text-sm mb-2">
                  Configure how long each trading round will last. Players will have this amount of time to make trades before the round ends and prices update.
                </p>
              </div>
              <div className="space-y-3">
                {Array.from({ length: totalRounds }, (_, i) => i + 1).map(roundNum => (
                  <div key={roundNum} className="flex items-center gap-4 p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="text-white font-medium w-24">Round {roundNum}</div>
                    <input
                      type="number"
                      value={roundDurations[roundNum] || 10}
                      onChange={(e) => setRoundDurations({
                        ...roundDurations,
                        [roundNum]: Math.max(1, parseInt(e.target.value) || 10)
                      })}
                      className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-[#FF00A8]/50"
                      min="1"
                      max="120"
                    />
                    <div className="text-white/60 w-24">minutes</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PRICES TAB */}
          {activeTab === 'prices' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">Price Matrix</h3>
                <p className="text-white/60 text-sm">{stocks.length} stock{stocks.length !== 1 ? 's' : ''} × {totalRounds} round{totalRounds > 1 ? 's' : ''}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4">
                <p className="text-white/80 text-sm mb-2">
                  Set the price for each stock in each round. Prices automatically update when rounds advance. Create realistic market scenarios by varying prices!
                </p>
                <div className="flex gap-2 mt-3">
                  <span className="text-white/40 text-xs">💡 Tip:</span>
                  <span className="text-white/60 text-xs">Try increasing some stocks while decreasing others to create interesting trading opportunities</span>
                </div>
              </div>
              {stocks.length === 0 ? (
                <div className="text-center py-12 text-white/40 bg-white/5 rounded-lg border border-white/10">
                  <span className="material-symbols-outlined text-5xl mb-3 block opacity-40">candlestick_chart</span>
                  <p>Add stocks first to configure prices</p>
                  <p className="text-xs mt-2">Go to the "Stocks" tab to add stocks</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-white/10">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-white/5">
                        <th className="sticky left-0 bg-[#1a1a1a]/95 p-3 text-left text-white/80 text-sm font-medium border-r border-white/10 min-w-[100px]">
                          Stock
                        </th>
                        {Array.from({ length: totalRounds }, (_, i) => i + 1).map(roundNum => (
                          <th key={roundNum} className="p-3 text-center text-white/80 text-sm font-medium border-l border-white/10 min-w-[120px]">
                            Round {roundNum}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stocks.map((stock, idx) => (
                        <tr key={stock.symbol} className={idx % 2 === 0 ? 'bg-white/5' : ''}>
                          <td className="sticky left-0 bg-[#1a1a1a]/95 p-3 border-r border-white/10">
                            <div className="text-white font-semibold">{stock.symbol}</div>
                            <div className="text-white/40 text-xs">{stock.display_name}</div>
                          </td>
                          {Array.from({ length: totalRounds }, (_, i) => i + 1).map(roundNum => (
                            <td key={roundNum} className="p-2 border-l border-white/10">
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
                                <input
                                  type="number"
                                  value={getPriceForRound(stock.symbol, roundNum)}
                                  onChange={(e) => handlePriceChange(roundNum, stock.symbol, e.target.value)}
                                  className="w-full pl-6 pr-3 py-2 rounded bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FF00A8]/50 focus:border-[#FF00A8]/50"
                                  step="0.01"
                                  min="0.01"
                                  placeholder="0.00"
                                />
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 rounded-lg bg-gradient-primary text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Game'}
          </button>
        </div>
      </div>
    </div>
  )
}
