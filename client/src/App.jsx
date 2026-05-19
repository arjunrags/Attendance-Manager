import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom'
import axios from 'axios'
import { LogOut, Settings, Users, BookOpen, FileBarChart } from 'lucide-react'

// Pages
import Login from './pages/Login'
import ExamSettings from './pages/ExamSettings'
import Classrooms from './pages/Classrooms'
import Subjects from './pages/Subjects'
import Reports from './pages/Reports'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      axios.defaults.headers.common.Authorization = `Bearer ${token}`
      axios.get('/auth/verify')
        .then(res => {
          if (res.data.valid) {
            setUser(res.data.user)
          } else {
            handleLogout()
          }
        })
        .catch(() => handleLogout())
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const handleLogin = (data) => {
    localStorage.setItem('token', data.token)
    axios.defaults.headers.common.Authorization = `Bearer ${data.token}`
    setUser({ username: data.username, role: data.role })
    navigate('/')
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    delete axios.defaults.headers.common.Authorization
    setUser(null)
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} />
      <Route path="/*" element={user ? <DashboardLayout user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} />
    </Routes>
  )
}

function DashboardLayout({ user, onLogout }) {
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Exam Setup', icon: <Settings size={20} /> },
    { path: '/classrooms', label: 'Classrooms & Labs', icon: <Users size={20} /> },
    { path: '/subjects', label: 'Subjects', icon: <BookOpen size={20} /> },
    { path: '/reports', label: 'Reports & Export', icon: <FileBarChart size={20} /> },
  ]

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card p-6 flex flex-col">
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-accent tracking-wider">SURE-SEAT PRO</h1>
          <p className="text-xs text-muted mt-1 uppercase tracking-widest">{user.role}</p>
        </div>
        
        <nav className="flex-1 space-y-2">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link w-full text-left ${location.pathname === item.path ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        
        <button onClick={onLogout} className="nav-link text-red-400 hover:text-red-300 hover:bg-red-950/30 mt-auto w-full">
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <Routes>
          <Route path="/" element={<ExamSettings />} />
          <Route path="/classrooms" element={<Classrooms />} />
          <Route path="/subjects" element={<Subjects />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
