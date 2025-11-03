import { useState } from 'react'
import { auth } from '../lib/supabase'

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Login only (signup disabled)
      const data = await auth.signIn(username, password)
      console.log('Login successful:', data)
      if (onLoginSuccess) onLoginSuccess(data)
    } catch (err) {
      console.error('Auth error:', err)
      setError(err.message || 'Invalid username or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center bg-background-dark overflow-hidden">
      {/* Background Glows */}
      <div className="absolute -top-1/4 -left-1/4 h-1/2 w-1/2 rounded-full bg-[#FF00A8]/20 blur-[150px]"></div>
      <div className="absolute -bottom-1/4 -right-1/4 h-1/2 w-1/2 rounded-full bg-[#FF6F00]/20 blur-[150px]"></div>

      {/* Glass Panel Card */}
      <div className="relative w-full max-w-md rounded-xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-2xl">
        <div className="flex flex-col items-center">
          {/* Headline */}
          <h1 className="text-white tracking-light text-[32px] font-bold leading-tight text-center pb-8 text-gradient">
            INVESTOMANIA
          </h1>

          <p className="text-white/60 text-sm text-center mb-8">
            Login with your provided credentials
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-6">
            {/* Username Field */}
            <label className="flex w-full flex-col">
              <p className="text-[#EAEAEA] text-base font-medium leading-normal pb-2">
                Username
              </p>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#EAEAEA] focus:outline-0 focus:ring-2 focus:ring-primary/50 border-white/10 bg-white/5 h-14 placeholder:text-white/40 p-4 text-base font-normal leading-normal transition-shadow duration-300"
                placeholder="Enter your username"
                required
              />
            </label>

            {/* Password Field */}
            <label className="flex w-full flex-col">
              <p className="text-[#EAEAEA] text-base font-medium leading-normal pb-2">
                Password
              </p>
              <div className="flex w-full flex-1 items-stretch">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-l-lg text-[#EAEAEA] focus:outline-0 focus:ring-2 focus:ring-primary/50 border-white/10 bg-white/5 h-14 placeholder:text-white/40 p-4 border-r-0 text-base font-normal leading-normal transition-shadow duration-300"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-white/40 flex border border-l-0 border-white/10 bg-white/5 items-center justify-center px-4 rounded-r-lg hover:text-white/60 transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                    {showPassword ? 'visibility' : 'visibility_off'}
                  </span>
                </button>
              </div>
            </label>

            {/* Error Message */}
            {error && (
              <div className="w-full p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-red-400 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="w-full pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex w-full min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-gradient-primary text-white text-base font-bold leading-normal tracking-[0.015em] hover:brightness-110 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="truncate">
                  {loading ? 'Please wait...' : 'Login'}
                </span>
              </button>
            </div>
          </form>

          {/* Contact Admin */}
          <div className="pt-8">
            <p className="text-[#EAEAEA]/60 text-xs font-normal leading-normal text-center">
              Don't have credentials? Contact your administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
