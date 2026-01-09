import React from 'react';
import { format } from 'date-fns';

const ExpenseList = ({ expenses, loading, onSelectExpense, selectedExpenseId }) => {
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <p>Loading expenses...</p>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div style={styles.emptyContainer}>
        <p>No expenses found</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {expenses.map((expense) => (
        <div
          key={expense.id}
          onClick={() => onSelectExpense(expense)}
          style={{
            ...styles.card,
            ...(selectedExpenseId === expense.id ? styles.cardSelected : {}),
            ...(expense.deleted ? styles.cardDeleted : {})
          }}
        >
          <div style={styles.cardHeader}>
            <h3 style={styles.memberName}>{expense.member_name}</h3>
            <span style={{
              ...styles.statusBadge,
              ...styles[`status${expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}`]
            }}>
              {expense.status}
            </span>
          </div>

          <p style={styles.description}>{expense.description}</p>

          <div style={styles.cardFooter}>
            <span style={styles.amount}>€{parseFloat(expense.amount).toFixed(2)}</span>
            <span style={styles.date}>
              {format(new Date(expense.date_entered), 'MMM dd, yyyy')}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  card: {
    backgroundColor: 'rgb(24, 30, 40)',
    border: '1px solid transparent',
    borderRadius: '0.75rem',
    padding: '1.5rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  cardSelected: {
    backgroundColor: 'rgb(31, 41, 55)',
    border: '1px solid rgb(255, 173, 179)',
  },
  cardDeleted: {
    opacity: 0.5,
    backgroundColor: 'rgb(25, 31, 40)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem',
  },
  memberName: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: 'rgb(200, 205, 210)',
  },
  statusBadge: {
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  statusPending: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    color: 'rgb(251, 191, 36)',
  },
  statusPaid: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    color: 'rgb(34, 197, 94)',
  },
  statusDenied: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: 'rgb(239, 68, 68)',
  },
  description: {
    color: 'rgb(156, 163, 175)',
    fontSize: '0.875rem',
    marginBottom: '1rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amount: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: 'rgb(230, 155, 161)',
  },
  date: {
    fontSize: '0.875rem',
    color: 'rgb(156, 163, 175)',
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '4rem 2rem',
    color: 'rgb(156, 163, 175)',
  },
  emptyContainer: {
    textAlign: 'center',
    padding: '4rem 2rem',
    backgroundColor: 'rgb(31, 41, 55)',
    border: '1px solid rgb(55, 65, 81)',
    borderRadius: '0.75rem',
    color: 'rgb(156, 163, 175)',
  },
};

export default ExpenseList;
