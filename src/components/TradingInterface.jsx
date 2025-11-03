import { useState, useEffect } from 'react'
import { gameApi, subscriptions } from '../lib/supabase'

export default function TradingInterface({ gameId, playerId }) {
  const [stocks, setStocks] = useState([])
  const [positions, setPositions] = useState([])
  const [orders, setOrders] = useState([])
  const [playerState, setPlayerState] = useState(null)
  const [currentRound, setCurrentRound] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedStock, setSelectedStock] = useState(null)
  const [orderType, setOrderType] = useState('buy')
  const [quantity, setQuantity] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadTradingData()

    // Subscribe to real-time updates
    const positionsChannel = subscriptions.subscribeToPositions(gameId, playerId, () => {
      loadPositions()
    })

    const tradesChannel = subscriptions.subscribeToTrades(gameId, () => {
      loadOrders()
    })

    const playerStateChannel = subscriptions.subscribeToPlayerState(gameId, playerId, () => {
      loadPlayerState()
    })

    // Subscribe to round changes to update stock prices
    const roundsChannel = subscriptions.subscribeToRounds(gameId, () => {
      loadStocks()
      loadCurrentRound()
    })

    // Subscribe to game changes to detect round progression
    const gamesChannel = subscriptions.subscribeToGames(() => {
      loadStocks()
      loadCurrentRound()
    })

    return () => {
      positionsChannel.unsubscribe()
      tradesChannel.unsubscribe()
      playerStateChannel.unsubscribe()
      roundsChannel.unsubscribe()
      gamesChannel.unsubscribe()
    }
  }, [gameId, playerId])

  const loadTradingData = async () => {
    try {
      await Promise.all([
        loadStocks(),
        loadPositions(),
        loadOrders(),
        loadPlayerState(),
        loadCurrentRound(),
      ])
    } catch (err) {
      console.error('Error loading trading data:', err)
      setError('Failed to load trading data')
    } finally {
      setLoading(false)
    }
  }

  const loadStocks = async () => {
    try {
      const { data, error } = await gameApi.getStocks(gameId)
      if (error) throw error

      // Get current prices for stocks
      const game = await gameApi.getGameById(gameId)
      if (game.data.current_round_number) {
        const prices = await gameApi.getRoundPrices(gameId, game.data.current_round_number)
        if (prices.data) {
          // Merge prices with stocks
          const stocksWithPrices = data.map(stock => {
            const priceData = prices.data.find(p => p.symbol === stock.symbol)
            return {
              ...stock,
              current_price: priceData?.price || stock.initial_price,
            }
          })
          setStocks(stocksWithPrices)
          return
        }
      }

      setStocks(data || [])
    } catch (err) {
      console.error('Error loading stocks:', err)
    }
  }

  const loadPositions = async () => {
    try {
      const { data, error } = await gameApi.getPositions(gameId, playerId)
      if (error) throw error
      setPositions(data || [])
    } catch (err) {
      console.error('Error loading positions:', err)
    }
  }

  const loadOrders = async () => {
    try {
      const { data, error } = await gameApi.getOrders(gameId, playerId)
      if (error) throw error
      setOrders(data || [])
    } catch (err) {
      console.error('Error loading orders:', err)
    }
  }

  const loadPlayerState = async () => {
    try {
      const { data, error } = await gameApi.getPlayerState(gameId, playerId)
      if (error) throw error
      setPlayerState(data)
    } catch (err) {
      console.error('Error loading player state:', err)
    }
  }

  const loadCurrentRound = async () => {
    try {
      const game = await gameApi.getGameById(gameId)
      if (game.data.current_round_number) {
        const rounds = await gameApi.getRounds(gameId)
        const current = rounds.data.find(r => r.round_number === game.data.current_round_number)
        setCurrentRound(current)
      }
    } catch (err) {
      console.error('Error loading current round:', err)
    }
  }

  const handlePlaceOrder = async () => {
    if (!selectedStock || !quantity || parseInt(quantity) <= 0) {
      alert('Please select a stock and enter a valid quantity')
      return
    }

    setSubmitting(true)
    try {
      const { error } = await gameApi.placeOrder(
        gameId,
        selectedStock.symbol,
        orderType,
        parseInt(quantity)
      )

      if (error) throw error

      alert('Order placed successfully!')
      setQuantity('')
      setSelectedStock(null)

      // Reload data
      await loadTradingData()
    } catch (err) {
      console.error('Error placing order:', err)
      alert(err.message || 'Failed to place order')
    } finally {
      setSubmitting(false)
    }
  }

  const getPosition = (symbol) => {
    return positions.find(p => p.symbol === symbol)
  }

  const calculateMaxQuantity = (stock) => {
    if (!stock || !playerState) return 0

    if (orderType === 'buy') {
      return Math.floor(playerState.cash / stock.current_price)
    } else {
      // For sell, max is current position quantity
      const position = getPosition(stock.symbol)
      return position?.quantity || 0
    }
  }

  if (loading) {
    return (
      <div className="glass-panel p-6 rounded-xl">
        <div className="text-center text-white/60">Loading trading interface...</div>
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

  const canTrade = currentRound?.status === 'active'

  return (
    <div className="space-y-6">
      {/* Round Indicator */}
      {currentRound && (
        <div className="glass-panel rounded-xl p-4 border-l-4 border-l-[#FF00A8]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl text-[#FF00A8]">
                schedule
              </span>
              <div>
                <div className="text-white font-bold">Current Round: {currentRound.round_number}</div>
                <div className="text-white/60 text-sm">
                  Prices shown below are for this round
                </div>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              currentRound.status === 'active'
                ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30'
                : 'bg-gray-500/20 text-gray-300 ring-1 ring-gray-500/30'
            }`}>
              {currentRound.status === 'active' ? 'Active' : 'Not Active'}
            </div>
          </div>
        </div>
      )}

      {/* Account Summary */}
      <div className="glass-panel rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">Account Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-white/60 text-sm mb-1">Cash</div>
            <div className="text-white font-bold text-2xl font-mono">
              ${playerState?.cash?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <div className="text-white/60 text-sm mb-1">Equity Value</div>
            <div className="text-white font-bold text-2xl font-mono">
              ${playerState?.equity_value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <div className="text-white/60 text-sm mb-1">Total Value</div>
            <div className="text-white font-bold text-2xl font-mono">
              ${playerState?.total_value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {!canTrade && currentRound && (
        <div className="glass-panel rounded-xl p-6 bg-yellow-500/10 border-yellow-500/30">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-2xl text-yellow-400">warning</span>
            <div>
              <div className="text-white font-semibold">Trading Paused</div>
              <div className="text-white/60 text-sm">
                {currentRound.status === 'completed'
                  ? 'This round has ended. Waiting for next round to start...'
                  : 'Trading is only available during active rounds. Wait for the next round to start.'}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Entry */}
        <div className="glass-panel rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 p-6 border-b border-white/10">
            <span className="material-symbols-outlined text-2xl text-[#FF00A8]">
              add_shopping_cart
            </span>
            <h3 className="text-xl font-bold text-white">Place Order</h3>
          </div>

          <div className="p-6 space-y-4">
            {/* Buy/Sell Toggle */}
            <div className="flex gap-2 p-1 bg-white/5 rounded-lg border border-white/10">
              <button
                onClick={() => setOrderType('buy')}
                disabled={!canTrade}
                className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${
                  orderType === 'buy'
                    ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                } ${!canTrade ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                BUY
              </button>
              <button
                onClick={() => setOrderType('sell')}
                disabled={!canTrade}
                className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${
                  orderType === 'sell'
                    ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                } ${!canTrade ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                SELL
              </button>
            </div>

            {/* Stock Selector */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Select Stock
              </label>
              <select
                value={selectedStock?.symbol || ''}
                onChange={(e) => {
                  const stock = stocks.find(s => s.symbol === e.target.value)
                  setSelectedStock(stock)
                  setQuantity('')
                }}
                disabled={!canTrade}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-[#FF00A8]/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">-- Choose a stock --</option>
                {stocks.map(stock => {
                  const position = getPosition(stock.symbol)
                  return (
                    <option key={stock.symbol} value={stock.symbol}>
                      {stock.symbol} - ${stock.current_price?.toFixed(2)}
                      {position ? ` (Owned: ${position.quantity})` : ''}
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Quantity Input */}
            {selectedStock && (
              <>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-white/80 text-sm font-medium">
                      Quantity
                    </label>
                    <button
                      onClick={() => setQuantity(calculateMaxQuantity(selectedStock).toString())}
                      disabled={!canTrade}
                      className="text-[#FF00A8] text-xs font-medium hover:underline disabled:opacity-50"
                    >
                      Max: {calculateMaxQuantity(selectedStock)}
                    </button>
                  </div>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    disabled={!canTrade}
                    placeholder="Enter quantity"
                    min="1"
                    max={calculateMaxQuantity(selectedStock)}
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-[#FF00A8]/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Order Summary */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="text-white/60 text-sm mb-2">Order Summary</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-white/80">
                      <span>Price per share:</span>
                      <span className="font-mono">${selectedStock.current_price?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-white/80">
                      <span>Quantity:</span>
                      <span className="font-mono">{quantity || 0}</span>
                    </div>
                    <div className="flex justify-between text-white font-semibold text-base pt-2 border-t border-white/10">
                      <span>Total:</span>
                      <span className="font-mono">
                        ${((selectedStock.current_price || 0) * (parseInt(quantity) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  onClick={handlePlaceOrder}
                  disabled={!canTrade || submitting || !quantity || parseInt(quantity) <= 0}
                  className={`w-full py-3 rounded-lg font-bold text-sm transition-all ${
                    orderType === 'buy'
                      ? 'bg-green-500 hover:bg-green-600'
                      : 'bg-red-500 hover:bg-red-600'
                  } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {submitting ? 'Placing Order...' : `${orderType === 'buy' ? 'Buy' : 'Sell'} ${selectedStock.symbol}`}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Current Positions */}
        <div className="glass-panel rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 p-6 border-b border-white/10">
            <span className="material-symbols-outlined text-2xl text-[#FF00A8]">
              account_balance_wallet
            </span>
            <h3 className="text-xl font-bold text-white">Current Positions</h3>
          </div>

          {positions.length === 0 ? (
            <div className="p-12 text-center text-white/40">
              <span className="material-symbols-outlined text-5xl mb-2 block">
                inventory_2
              </span>
              <p>No positions yet</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {positions.map(position => {
                const stock = stocks.find(s => s.symbol === position.symbol)
                const currentValue = (stock?.current_price || 0) * position.quantity
                const costBasis = position.average_price * position.quantity
                const pnl = currentValue - costBasis
                const pnlPercent = ((pnl / costBasis) * 100).toFixed(2)

                return (
                  <div key={position.symbol} className="p-4 hover:bg-white/5 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-white font-bold">{position.stock_symbol || stock?.symbol}</div>
                        <div className="text-white/60 text-sm">{position.stock_name || stock?.company_name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-semibold font-mono">
                          {position.quantity} shares
                        </div>
                        <div className="text-white/60 text-sm">
                          @ ${position.average_price.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <div className="text-white/60">
                        Current: ${stock?.current_price?.toFixed(2)}
                      </div>
                      <div className={pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} ({pnl >= 0 ? '+' : ''}{pnlPercent}%)
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 p-6 border-b border-white/10">
          <span className="material-symbols-outlined text-2xl text-[#FF00A8]">
            receipt_long
          </span>
          <h3 className="text-xl font-bold text-white">Recent Orders</h3>
        </div>

        {orders.length === 0 ? (
          <div className="p-12 text-center text-white/40">
            <span className="material-symbols-outlined text-5xl mb-2 block">
              receipt
            </span>
            <p>No orders yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 text-white/60 text-sm">
                <tr>
                  <th className="px-6 py-3 text-left">Time</th>
                  <th className="px-6 py-3 text-left">Stock</th>
                  <th className="px-6 py-3 text-left">Side</th>
                  <th className="px-6 py-3 text-right">Quantity</th>
                  <th className="px-6 py-3 text-right">Price</th>
                  <th className="px-6 py-3 text-right">Total</th>
                  <th className="px-6 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orders.slice(0, 10).map((order) => {
                  return (
                    <tr key={order.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-3 text-white/80 text-sm">
                        {new Date(order.created_at).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-3 text-white font-semibold">
                        {order.stock_symbol}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`text-xs font-bold ${
                          order.side === 'buy' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {order.side.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-white text-right font-mono">
                        {order.quantity}
                      </td>
                      <td className="px-6 py-3 text-white text-right font-mono">
                        {order.filled_price ? `$${order.filled_price.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-6 py-3 text-white text-right font-mono">
                        {order.filled_price
                          ? `$${(order.filled_price * order.quantity).toFixed(2)}`
                          : '-'}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                          order.status === 'filled'
                            ? 'bg-green-500/20 text-green-400 ring-green-500/30'
                            : order.status === 'rejected'
                            ? 'bg-red-500/20 text-red-400 ring-red-500/30'
                            : 'bg-gray-500/20 text-gray-300 ring-gray-500/30'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
