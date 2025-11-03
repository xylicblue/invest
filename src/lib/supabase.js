import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// =====================================================
// AUTHENTICATION API
// =====================================================

export const auth = {
  // Convert username to email format (username@investo.local)
  usernameToEmail: (username) => `${username.toLowerCase()}@investo.local`,

  // Sign in with username and password
  signIn: async (username, password) => {
    const email = auth.usernameToEmail(username)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  },

  // Sign up with username and password
  signUp: async (username, password) => {
    const email = auth.usernameToEmail(username)
    const { data, error} = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username.toLowerCase(),
        },
      },
    })
    if (error) throw error
    return data
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  // Get current user and profile
  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error

    if (!user) return { user: null, profile: null }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      // Create profile if doesn't exist
      const { data: newProfile } = await supabase.rpc('ensure_profile')
      return { user, profile: newProfile }
    }

    return { user, profile }
  },

  // Get auth session
  getSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) throw error
    return session
  },

  // Listen to auth state changes
  onAuthStateChange: (callback) => {
    return supabase.auth.onAuthStateChange(callback)
  },
}

// =====================================================
// GAME API (Main API for V2)
// =====================================================

export const gameApi = {
  // ------------------- GAME MANAGEMENT -------------------

  // Get all games
  getGames: async () => {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return { data, error: null }
  },

  // Get single game by ID
  getGameById: async (gameId) => {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single()

    if (error) throw error
    return { data, error: null }
  },

  // Get single game with stocks and rounds
  getGame: async (gameId) => {
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single()

    if (gameError) throw gameError

    const { data: stocks, error: stocksError } = await supabase
      .from('game_stocks')
      .select('*')
      .eq('game_id', gameId)

    if (stocksError) throw stocksError

    const { data: rounds, error: roundsError } = await supabase
      .from('game_rounds')
      .select('*')
      .eq('game_id', gameId)
      .order('round_number', { ascending: true })

    if (roundsError) throw roundsError

    return {
      data: {
        ...game,
        stocks,
        rounds,
      },
      error: null,
    }
  },

  // Create new game (admin only)
  createGame: async (gameData) => {
    const { data, error } = await supabase
      .from('games')
      .insert([gameData])
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  },

  // Update game
  updateGame: async (gameId, updates) => {
    const { data, error } = await supabase
      .from('games')
      .update(updates)
      .eq('id', gameId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  },

  // Delete game
  deleteGame: async (gameId) => {
    const { error } = await supabase
      .from('games')
      .delete()
      .eq('id', gameId)

    if (error) throw error
    return { data: null, error: null }
  },

  // ------------------- ROUND MANAGEMENT -------------------

  // Get all rounds for a game
  getRounds: async (gameId) => {
    const { data, error } = await supabase
      .from('game_rounds')
      .select('*')
      .eq('game_id', gameId)
      .order('round_number', { ascending: true })

    if (error) throw error
    return { data, error: null }
  },

  // Get current active round
  getCurrentRound: async (gameId) => {
    const { data: game } = await supabase
      .from('games')
      .select('current_round_number')
      .eq('id', gameId)
      .single()

    if (!game || game.current_round_number === 0) {
      return { data: null, error: null }
    }

    const { data, error } = await supabase
      .from('game_rounds')
      .select('*')
      .eq('game_id', gameId)
      .eq('round_number', game.current_round_number)
      .single()

    if (error) throw error
    return { data, error: null }
  },

  // Bulk create rounds
  createRounds: async (rounds) => {
    const { data, error } = await supabase
      .from('game_rounds')
      .insert(rounds)
      .select()

    if (error) throw error
    return { data, error: null }
  },

  // Update round
  updateRound: async (roundId, updates) => {
    const { data, error } = await supabase
      .from('game_rounds')
      .update(updates)
      .eq('id', roundId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  },

  // ------------------- STOCK MANAGEMENT -------------------

  // Get all stocks for a game
  getGameStocks: async (gameId) => {
    const { data, error } = await supabase
      .from('game_stocks')
      .select('*')
      .eq('game_id', gameId)
      .order('symbol', { ascending: true })

    if (error) throw error
    return { data, error: null }
  },

  // Alias for getGameStocks
  getStocks: async (gameId) => {
    const { data, error } = await supabase
      .from('game_stocks')
      .select('*')
      .eq('game_id', gameId)
      .order('symbol', { ascending: true })

    if (error) throw error
    return { data, error: null }
  },

  // Add stock to game
  addStockToGame: async (gameId, stock) => {
    const { data, error } = await supabase
      .from('game_stocks')
      .insert([{
        game_id: gameId,
        ...stock,
      }])
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  },

  // Remove stock from game
  removeStockFromGame: async (gameId, symbol) => {
    const { error } = await supabase
      .from('game_stocks')
      .delete()
      .eq('game_id', gameId)
      .eq('symbol', symbol)

    if (error) throw error
    return { data: null, error: null }
  },

  // ------------------- PRICE MANAGEMENT (CORE V2 FEATURE) -------------------

  // Get prices for a specific round (with stock info)
  getRoundPrices: async (gameId, roundNumber) => {
    // Fetch round prices
    const { data: prices, error: pricesError } = await supabase
      .from('round_prices')
      .select('*')
      .eq('game_id', gameId)
      .eq('round_number', roundNumber)

    if (pricesError) throw pricesError

    // Fetch game stocks to get company names
    const { data: stocks, error: stocksError } = await supabase
      .from('game_stocks')
      .select('*')
      .eq('game_id', gameId)

    if (stocksError) throw stocksError

    // Merge the data
    const formattedData = prices?.map(price => {
      const stock = stocks?.find(s => s.symbol === price.symbol)
      return {
        ...price,
        stock_symbol: price.symbol,
        stock_name: stock?.company_name,
        stock_id: stock?.id,
      }
    })

    return { data: formattedData, error: null }
  },

  // Get current prices (for active round)
  getCurrentPrices: async (gameId) => {
    const { data, error } = await supabase.rpc('get_current_round_prices', {
      p_game_id: gameId,
    })

    if (error) throw error
    return { data, error: null }
  },

  // Set prices for a round (admin only)
  setRoundPrices: async (gameId, roundNumber, prices) => {
    // Delete existing prices for this round
    await supabase
      .from('round_prices')
      .delete()
      .eq('game_id', gameId)
      .eq('round_number', roundNumber)

    // Insert new prices
    const priceRecords = prices.map(({ symbol, price }) => ({
      game_id: gameId,
      round_number: roundNumber,
      symbol,
      price,
    }))

    const { data, error } = await supabase
      .from('round_prices')
      .insert(priceRecords)
      .select()

    if (error) throw error
    return { data, error: null }
  },

  // ------------------- PLAYER ACTIONS -------------------

  // Join a game
  joinGame: async (gameId) => {
    const { data, error } = await supabase.rpc('join_game', {
      p_game_id: gameId,
    })

    if (error) throw error
    return { data, error: null }
  },

  // Get player's state in a game
  getPlayerState: async (gameId, playerId = null) => {
    let userId = playerId

    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      userId = user.id
    }

    const { data, error } = await supabase
      .from('player_game_state')
      .select('*')
      .eq('game_id', gameId)
      .eq('player_id', userId)
      .single()

    if (error) throw error
    return { data, error: null }
  },

  // Get player's positions in a game
  getPositions: async (gameId, playerId = null) => {
    let userId = playerId

    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      userId = user.id
    }

    // Fetch positions
    const { data: positions, error: positionsError } = await supabase
      .from('positions')
      .select('*')
      .eq('game_id', gameId)
      .eq('player_id', userId)

    if (positionsError) throw positionsError

    // Fetch game stocks to get company names
    const { data: stocks, error: stocksError } = await supabase
      .from('game_stocks')
      .select('*')
      .eq('game_id', gameId)

    if (stocksError) throw stocksError

    // Merge the data
    const formattedData = positions?.map(position => {
      const stock = stocks?.find(s => s.symbol === position.symbol)
      return {
        ...position,
        stock_id: stock?.id,
        stock_symbol: position.symbol,
        stock_name: stock?.company_name,
      }
    })

    return { data: formattedData, error: null }
  },

  // Calculate portfolio value
  calculatePortfolioValue: async (gameId) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase.rpc('calculate_portfolio_value_v2', {
      p_player_id: user.id,
      p_game_id: gameId,
    })

    if (error) throw error
    return { data, error: null }
  },

  // ------------------- TRADING -------------------

  // Place an order
  placeOrder: async (gameId, symbol, side, quantity) => {
    const { data, error } = await supabase.rpc('place_order_v2', {
      p_game_id: gameId,
      p_symbol: symbol,
      p_side: side,
      p_quantity: quantity,
    })

    if (error) throw error
    return { data, error: null }
  },

  // Get player's orders
  getOrders: async (gameId, playerId = null) => {
    let userId = playerId

    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      userId = user.id
    }

    // Fetch orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('game_id', gameId)
      .eq('player_id', userId)
      .order('created_at', { ascending: false })

    if (ordersError) throw ordersError

    // Fetch game stocks to get company names
    const { data: stocks, error: stocksError } = await supabase
      .from('game_stocks')
      .select('*')
      .eq('game_id', gameId)

    if (stocksError) throw stocksError

    // Merge the data
    const formattedData = orders?.map(order => {
      const stock = stocks?.find(s => s.symbol === order.symbol)
      return {
        ...order,
        stock_id: stock?.id,
        stock_symbol: order.symbol,
        stock_name: stock?.company_name,
      }
    })

    return { data: formattedData, error: null }
  },

  // Get player's trades
  getTrades: async (gameId) => {
    const { data, error } = await supabase.rpc('get_player_trades', {
      p_game_id: gameId,
    })

    if (error) throw error
    return { data, error: null }
  },

  // ------------------- LEADERBOARD -------------------

  // Get game leaderboard
  getLeaderboard: async (gameId) => {
    const { data, error } = await supabase.rpc('get_game_leaderboard', {
      p_game_id: gameId,
    })

    if (error) throw error
    return { data, error: null }
  },

  // Alternative: Get leaderboard via view
  getLeaderboardView: async (gameId) => {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .eq('game_id', gameId)
      .order('rank', { ascending: true })

    if (error) throw error
    return { data, error: null }
  },

  // ------------------- ADMIN CONTROL -------------------

  // Start a game (admin only)
  startGame: async (gameId) => {
    const { data, error } = await supabase.rpc('start_game', {
      p_game_id: gameId,
    })

    if (error) throw error
    return { data, error: null }
  },

  // Advance to next round (admin only)
  advanceToNextRound: async (gameId) => {
    const { data, error } = await supabase.rpc('advance_to_next_round', {
      p_game_id: gameId,
    })

    if (error) throw error
    return { data, error: null }
  },

  // Update all portfolios (admin only)
  updateAllPortfolios: async (gameId) => {
    const { data, error } = await supabase.rpc('update_all_portfolios', {
      p_game_id: gameId,
    })

    if (error) throw error
    return { data, error: null }
  },
}

// =====================================================
// REAL-TIME SUBSCRIPTIONS
// =====================================================

export const subscriptions = {
  // Subscribe to game updates
  subscribeToGame: (gameId, callback) => {
    const channel = supabase
      .channel(`game:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        callback
      )
      .subscribe()

    return channel
  },

  // Subscribe to round updates
  subscribeToRounds: (gameId, callback) => {
    const channel = supabase
      .channel(`rounds:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rounds',
          filter: `game_id=eq.${gameId}`,
        },
        callback
      )
      .subscribe()

    return channel
  },

  // Subscribe to player's trades
  subscribeToTrades: (gameId, playerId, callback) => {
    const channel = supabase
      .channel(`trades:${gameId}:${playerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trades',
          filter: `game_id=eq.${gameId},player_id=eq.${playerId}`,
        },
        callback
      )
      .subscribe()

    return channel
  },

  // Subscribe to player state changes
  subscribeToPlayerState: (gameId, playerId, callback) => {
    const channel = supabase
      .channel(`player_state:${gameId}:${playerId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'player_game_state',
          filter: `game_id=eq.${gameId},player_id=eq.${playerId}`,
        },
        callback
      )
      .subscribe()

    return channel
  },

  // Subscribe to position changes
  subscribeToPositions: (gameId, playerId, callback) => {
    const channel = supabase
      .channel(`positions:${gameId}:${playerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'positions',
          filter: `game_id=eq.${gameId},player_id=eq.${playerId}`,
        },
        callback
      )
      .subscribe()

    return channel
  },

  // Subscribe to all games
  subscribeToGames: (callback) => {
    const channel = supabase
      .channel('games')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
        },
        callback
      )
      .subscribe()

    return channel
  },

  // Subscribe to leaderboard updates (via player_game_state)
  subscribeToLeaderboard: (gameId, callback) => {
    const channel = supabase
      .channel(`leaderboard:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'player_game_state',
          filter: `game_id=eq.${gameId}`,
        },
        callback
      )
      .subscribe()

    return channel
  },
}
