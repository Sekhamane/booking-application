import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import AdminSidebar from '../../components/admin/AdminSidebar'
import Spinner from '../../components/ui/Spinner'

export default function AdminLayout() {
  const { session, profile, loading } = useAuth()

  if (loading) return <div style={{ minHeight: '100vh', background: '#203238', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div>
  if (!session) return <Navigate to="/admin/login" replace />
  if (profile?.role !== 'admin') return <Navigate to="/account" replace />

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f7f8f5' }}>
      <AdminSidebar />
      <main className="admin-content" style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
        <Outlet />
      </main>
    </div>
  )
}
