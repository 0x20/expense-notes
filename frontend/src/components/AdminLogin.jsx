import React, { useState } from 'react';
import { adminAPI } from '../services/api';

const AdminLogin = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await adminAPI.login(password);
      localStorage.setItem('admin_token', response.access_token);
      onLogin();
    } catch (err) {
      setError('Invalid password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Admin Login</h1>

        {error && (
          <div style={styles.errorMessage}>{error}</div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              ...(loading ? styles.buttonDisabled : {})
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '1rem',
  },
  card: {
    backgroundColor: 'rgb(31, 41, 55)',
    borderRadius: '0.75rem',
    padding: '2rem',
    maxWidth: '400px',
    width: '100%',
    border: '1px solid rgb(55, 65, 81)',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '600',
    marginBottom: '2rem',
    color: 'rgb(255, 173, 179)',
    textAlign: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: 'rgb(243, 244, 246)',
  },
  input: {
    padding: '0.75rem',
    backgroundColor: 'rgb(17, 24, 39)',
    border: '1px solid rgb(55, 65, 81)',
    borderRadius: '0.375rem',
    color: 'rgb(243, 244, 246)',
    fontSize: '1rem',
    outline: 'none',
  },
  button: {
    padding: '0.875rem',
    backgroundColor: 'rgb(255, 173, 179)',
    color: 'rgb(17, 24, 39)',
    fontSize: '1rem',
    fontWeight: '600',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  errorMessage: {
    padding: '1rem',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '0.375rem',
    color: 'rgb(239, 68, 68)',
    marginBottom: '1.5rem',
    textAlign: 'center',
  },
};

export default AdminLogin;
