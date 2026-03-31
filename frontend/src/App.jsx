import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProductionPage from './pages/ProductionPage';
import MaterialsPage from './pages/MaterialsPage';
import PartiesPage from './pages/PartiesPage';
import BillingPage from './pages/BillingPage';
import ExpensesPage from './pages/ExpensesPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import ActivityLogsPage from './pages/ActivityLogsPage';
import './index.css';

function PrivateRoute({ children, adminOnly = false }) {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (adminOnly && !isAdmin) return <Navigate to="/production" />;
  return children;
}

function AppRoutes() {
  const { isAuthenticated, isAdmin } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to={isAdmin ? '/dashboard' : '/production'} /> : <LoginPage />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to={isAdmin ? '/dashboard' : '/production'} />} />
        <Route path="dashboard" element={<PrivateRoute adminOnly><DashboardPage /></PrivateRoute>} />
        <Route path="production" element={<ProductionPage />} />
        <Route path="materials" element={<MaterialsPage />} />
        <Route path="parties" element={<PrivateRoute adminOnly><PartiesPage /></PrivateRoute>} />
        <Route path="billing" element={<PrivateRoute adminOnly><BillingPage /></PrivateRoute>} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="reports" element={<PrivateRoute adminOnly><ReportsPage /></PrivateRoute>} />
        <Route path="users" element={<PrivateRoute adminOnly><UsersPage /></PrivateRoute>} />
        <Route path="activity-logs" element={<PrivateRoute adminOnly><ActivityLogsPage /></PrivateRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-right" toastOptions={{
          style: { background: '#1e1e3a', color: '#f1f5f9', border: '1px solid #2a2a50', fontSize: '13px', fontFamily: 'Inter' },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }} />
      </AuthProvider>
    </BrowserRouter>
  );
}
