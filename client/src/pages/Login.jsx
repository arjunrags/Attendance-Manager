import { useState } from 'react'
import axios from 'axios'
import { KeyRound, User } from 'lucide-react'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await axios.post('/auth/login', { username, password })
      onLogin(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-900/20 via-background to-background">
      <div className="w-full max-w-md glass-card space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-wider text-accent mb-2">SURE-SEAT PRO</h1>
          <p className="text-muted text-sm">Advanced Examination Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">{error}</div>}
          
          <div className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={20} />
              <input
                type="text"
                placeholder="Username"
                className="input-field pl-10"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            </div>
            
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={20} />
              <input
                type="password"
                placeholder="Password"
                className="input-field pl-10"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary w-full py-3 text-lg">
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
