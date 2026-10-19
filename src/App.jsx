import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Suspense, lazy } from 'react'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import { isSecurityHost } from './lib/securityHost'

const Home             = lazy(() => import('./pages/Home'))
const Book             = lazy(() => import('./pages/Book'))
const AdminLogin       = lazy(() => import('./pages/Admin/AdminLogin'))
const SecurityLogin    = lazy(() => import('./pages/Security/Login'))
const AdminLayout      = lazy(() => import('./pages/Admin/AdminLayout'))
const Account          = lazy(() => import('./pages/Account'))
const PrivacyNotice    = lazy(() => import('./pages/PrivacyNotice'))
const AccountBookings  = lazy(() => import('./pages/AccountBookings'))
const VerifyBooking    = lazy(() => import('./pages/VerifyBooking'))
const ProviderHome     = lazy(() => import('./pages/Provider/Home'))
const ProviderServices = lazy(() => import('./pages/Provider/Services'))
const ProviderAvailability = lazy(() => import('./pages/Provider/Availability'))
const ProviderBookings = lazy(() => import('./pages/Provider/Bookings'))
const ProviderWaitlist = lazy(() => import('./pages/Provider/Waitlist'))
const ProviderLayout   = lazy(() => import('./pages/Provider/Layout'))
const SecurityHome     = lazy(() => import('./pages/Security/Home'))
const SecurityLayout   = lazy(() => import('./pages/Security/Layout'))
const SecurityRoles    = lazy(() => import('./pages/Security/Roles'))
const PrivacyRequests  = lazy(() => import('./pages/Security/PrivacyRequests'))
const Dashboard        = lazy(() => import('./pages/Admin/Dashboard'))
const Bookings         = lazy(() => import('./pages/Admin/Bookings'))
const ValidatePayment  = lazy(() => import('./pages/Admin/ValidatePayment'))
const Customers        = lazy(() => import('./pages/Admin/Customers'))
const Users            = lazy(() => import('./pages/Admin/Users'))
const Providers        = lazy(() => import('./pages/Admin/Providers'))
const CustomerDetail   = lazy(() => import('./pages/Admin/CustomerDetail'))
const Waitlist         = lazy(() => import('./pages/Admin/Waitlist'))
const Analytics        = lazy(() => import('./pages/Admin/Analytics'))
const Settings         = lazy(() => import('./pages/Admin/Settings'))
const AIAnalytics      = lazy(() => import('./pages/Admin/AIAnalytics'))

const PublicLayout = ({ children }) => (
  <>
    <Navbar />
    <div>{children}</div>
    <Footer />
  </>
)

const Spinner = () => (
  <div style={{ minHeight: '100vh', background: '#203238', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ width: 40, height: 40, border: '3px solid #8bc3b0', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
  </div>
)

export default function App() {
  if (isSecurityHost) return <BrowserRouter>
    <Toaster position="bottom-right" toastOptions={{ style: { background: '#203238', color: '#f7f8f5', border: '1px solid #6f9b8e' } }} />
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/login" element={<SecurityLogin />} />
        <Route path="/" element={<SecurityLayout />}>
          <Route index element={<SecurityHome />} />
          <Route path="roles" element={<SecurityRoles />} />
          <Route path="privacy" element={<PrivacyRequests />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  </BrowserRouter>

  return (
    <BrowserRouter>
      <Toaster position="bottom-right" toastOptions={{ style: { background: '#203238', color: '#f7f8f5', border: '1px solid #6f9b8e' } }} />
      <Suspense fallback={<Spinner />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
          <Route path="/book" element={<PublicLayout><Book /></PublicLayout>} />
          <Route path="/account" element={<PublicLayout><Account /></PublicLayout>} />
          <Route path="/privacy" element={<PublicLayout><PrivacyNotice /></PublicLayout>} />
          <Route path="/account/bookings" element={<PublicLayout><AccountBookings /></PublicLayout>} />
          <Route path="/verify/:reference" element={<PublicLayout><VerifyBooking /></PublicLayout>} />
          <Route path="/provider" element={<PublicLayout><ProviderLayout /></PublicLayout>}>
            <Route index element={<ProviderHome />} />
            <Route path="services" element={<ProviderServices />} />
            <Route path="availability" element={<ProviderAvailability />} />
            <Route path="bookings" element={<ProviderBookings />} />
            <Route path="waitlist" element={<ProviderWaitlist />} />
          </Route>
          <Route path="/security" element={<PublicLayout><SecurityLayout /></PublicLayout>}>
            <Route index element={<SecurityHome />} />
            <Route path="roles" element={<SecurityRoles />} />
            <Route path="privacy" element={<PrivacyRequests />} />
          </Route>

          {/* Admin routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="bookings/:id/validate" element={<ValidatePayment />} />
            <Route path="customers" element={<Customers />} />
            <Route path="users" element={<Users />} />
            <Route path="providers" element={<Providers />} />
            <Route path="customers/:id" element={<CustomerDetail />} />
            <Route path="waitlist" element={<Waitlist />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="ai" element={<AIAnalytics />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
