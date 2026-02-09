import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from './components/app-layout'
import Dashboard from './pages/Dashboard'
import Configurator from './pages/Configurator'
import Jobs from './pages/Jobs'

export default function Router() {
    return (
        <Routes>
            <Route element={<AppLayout />}>
                <Route path="" element={<Dashboard />} />
                <Route path="create" element={<Configurator />} />
                <Route path="jobs" element={<Jobs />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </Routes>
    )
}
