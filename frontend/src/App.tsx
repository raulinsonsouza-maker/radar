import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useOutletContext } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { RequireAdmin, RequireAuth } from './auth/RequireAuth'
import { AppShell, type AppShellOutletContext } from './components/AppShell'
import AdminUsers from './pages/AdminUsers'
import Landing from './pages/Landing'
import LandingBruno from './pages/LandingBruno'
import Login from './pages/Login'
import Prospectos from './pages/Prospectos'
import ProspectosBruno from './pages/ProspectosBruno'
import { ThemeProvider } from './theme/ThemeContext'
import {
  loadUiLayout,
  saveUiLayout,
  syncUiLayoutQuery,
  type UiLayout,
} from './uiLayout'
import './App.css'

function AppProspectos() {
  const { uiLayout } = useOutletContext<AppShellOutletContext>()
  return uiLayout === 'bruno' ? <ProspectosBruno /> : <Prospectos />
}

function AppLanding() {
  const [layout, setLayout] = useState<UiLayout>(() => loadUiLayout())

  useEffect(() => {
    saveUiLayout(layout)
    syncUiLayoutQuery(layout)
  }, [layout])

  if (layout === 'bruno') {
    return <LandingBruno layout={layout} onLayoutChange={setLayout} />
  }
  return <Landing layout={layout} onLayoutChange={setLayout} />
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppLanding />} />
            <Route path="/login" element={<Login />} />
            <Route element={<RequireAuth />}>
              <Route element={<AppShell />}>
                <Route path="/app" element={<AppProspectos />} />
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
