import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const ExpenseView = () => {
  const { token } = useParams();
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    const fetchExpense = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/expenses/view/${token}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Expense not found');
          }
          throw new Error('Failed to load expense');
        }
        const data = await response.json();
        setExpense(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchExpense();
  }, [token, apiUrl]);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'rgb(34, 197, 94)';
      case 'denied': return 'rgb(239, 68, 68)';
      default: return 'rgb(234, 179, 8)';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'paid': return 'Paid';
      case 'denied': return 'Denied';
      default: return 'Pending';
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p style={styles.loading}>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.errorTitle}>Error</h1>
          <p style={styles.errorText}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Expense Note</h1>

        <div style={styles.statusBadge(getStatusColor(expense.status))}>
          {getStatusText(expense.status)}
        </div>

        <div style={styles.field}>
          <span style={styles.label}>Submitted by</span>
          <span style={styles.value}>{expense.member_name || 'Not provided'}</span>
        </div>

        <div style={styles.field}>
          <span style={styles.label}>Amount</span>
          <span style={styles.amount}>€{expense.amount.toFixed(2)}</span>
        </div>

        <div style={styles.field}>
          <span style={styles.label}>Description</span>
          <span style={styles.value}>{expense.description}</span>
        </div>

        <div style={styles.field}>
          <span style={styles.label}>Payment Method</span>
          <span style={styles.value}>{expense.payment_method === 'cash' ? 'Cash' : 'Bank Transfer (IBAN)'}</span>
        </div>

        <div style={styles.field}>
          <span style={styles.label}>Date Submitted</span>
          <span style={styles.value}>{formatDate(expense.date_entered)}</span>
        </div>

        {expense.pay_date && (
          <div style={styles.field}>
            <span style={styles.label}>Date Paid</span>
            <span style={styles.value}>{formatDate(expense.pay_date)}</span>
          </div>
        )}

        <p style={styles.footer}>
          This is a private link. Only share it with people who need to see this expense.
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: 'rgb(17, 24, 39)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
  },
  card: {
    backgroundColor: 'rgb(31, 41, 55)',
    border: '1px solid rgb(55, 65, 81)',
    borderRadius: '0.75rem',
    padding: '2rem',
    maxWidth: '500px',
    width: '100%',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: 'rgb(255, 173, 179)',
    marginBottom: '1.5rem',
    textAlign: 'center',
  },
  statusBadge: (color) => ({
    display: 'inline-block',
    padding: '0.5rem 1rem',
    borderRadius: '9999px',
    backgroundColor: color,
    color: 'white',
    fontWeight: '600',
    fontSize: '0.875rem',
    marginBottom: '1.5rem',
    textAlign: 'center',
    width: '100%',
  }),
  field: {
    marginBottom: '1rem',
    padding: '0.75rem',
    backgroundColor: 'rgb(17, 24, 39)',
    borderRadius: '0.375rem',
  },
  label: {
    display: 'block',
    fontSize: '0.75rem',
    color: 'rgb(156, 163, 175)',
    marginBottom: '0.25rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  value: {
    display: 'block',
    fontSize: '1rem',
    color: 'rgb(243, 244, 246)',
  },
  amount: {
    display: 'block',
    fontSize: '1.5rem',
    fontWeight: '600',
    color: 'rgb(255, 173, 179)',
  },
  loading: {
    color: 'rgb(156, 163, 175)',
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: 'rgb(239, 68, 68)',
    marginBottom: '0.5rem',
    textAlign: 'center',
  },
  errorText: {
    color: 'rgb(156, 163, 175)',
    textAlign: 'center',
  },
  footer: {
    marginTop: '1.5rem',
    fontSize: '0.75rem',
    color: 'rgb(107, 114, 128)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
};

export default ExpenseView;
