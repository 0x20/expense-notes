import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import ExpenseForm from './components/ExpenseForm';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';

function AppContent() {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(
    !!localStorage.getItem('admin_token')
  );
  const [accessToken, setAccessToken] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Extract access token from URL query parameter
    const params = new URLSearchParams(location.search);
    const token = params.get('access');
    if (token) {
      setAccessToken(token);
      sessionStorage.setItem('access_token', token);
      // Clean the URL by removing the query parameter
      navigate(location.pathname, { replace: true });
    } else {
      // Try to get token from sessionStorage
      const storedToken = sessionStorage.getItem('access_token');
      if (storedToken) {
        setAccessToken(storedToken);
      }
    }
  }, [location, navigate]);

  const handleLogin = () => {
    setIsAdminAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setIsAdminAuthenticated(false);
  };

  return (
    <Routes>
      <Route path="/" element={<ExpenseForm accessToken={accessToken} />} />
      <Route
        path="/admin"
        element={
          isAdminAuthenticated ? (
            <Navigate to="/admin/dashboard" replace />
          ) : (
            <AdminLogin onLogin={handleLogin} />
          )
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          isAdminAuthenticated ? (
            <AdminDashboard onLogout={handleLogout} />
          ) : (
            <Navigate to="/admin" replace />
          )
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
