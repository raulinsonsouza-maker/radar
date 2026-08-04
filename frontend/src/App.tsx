import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { RequireAdmin, RequireAuth } from './auth/RequireAuth'
import { AppShell } from './components/AppShell'
import AdminUsers from './pages/AdminUsers'
import LandingBruno from './pages/LandingBruno'
import Login from './pages/Login'
import ProspectosBruno from './pages/ProspectosBruno'
import { ThemeProvider } from './theme/ThemeContext'
import './App.css'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingBruno />} />
            <Route path="/login" element={<Login />} />
            <Route element={<RequireAuth />}>
              <Route element={<AppShell />}>
                <Route path="/app" element={<ProspectosBruno />} />
                <Route element={<RequireAdmin />}>
                  <Route path="/admin" element={<AdminUsers />} />
                </Route>
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
