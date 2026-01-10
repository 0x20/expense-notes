import React, { useState } from 'react';
import { expenseAPI } from '../services/api';

const ExpenseForm = ({ accessToken, mattermostUsername }) => {
  const [formData, setFormData] = useState({
    member_name: '',
    description: '',
    amount: '',
    member_email: '',
    payment_method: 'iban',
    iban: ''
  });
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Check if we need an access token (production mode)
  const isDevelopment = import.meta.env.DEV;

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handlePhotoChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setPhotos(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const submitData = new FormData();
      submitData.append('member_name', formData.member_name);
      submitData.append('description', formData.description);
      submitData.append('amount', formData.amount);
      submitData.append('member_email', formData.member_email);
      submitData.append('payment_method', formData.payment_method);
      if (formData.payment_method === 'iban') {
        submitData.append('iban', formData.iban);
      }

      // Append all photos
      if (photos.length > 0) {
        photos.forEach(photo => {
          submitData.append('photos', photo);
        });
      }

      await expenseAPI.submitExpense(submitData, accessToken);

      setSuccess(true);
      // Reset form
      setFormData({
        member_name: '',
        description: '',
        amount: '',
        member_email: '',
        payment_method: 'iban',
        iban: ''
      });
      setPhotos([]);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit expense');
    } finally {
      setLoading(false);
    }
  };

  // Show access required message if no token in production
  if (!isDevelopment && !accessToken) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>Access Required</h1>
          <div style={styles.errorMessage}>
            You need a valid access link to submit an expense.
            Please contact your admin or use the Mattermost bot to get an access link.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Submit Expense Note</h1>

        {mattermostUsername && (
          <div style={styles.usernameDisplay}>
            Submitting as: <strong>@{mattermostUsername}</strong>
          </div>
        )}

        {error && (
          <div style={styles.errorMessage}>{error}</div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Payment Method *</label>
            <select
              name="payment_method"
              value={formData.payment_method}
              onChange={handleInputChange}
              style={styles.select}
            >
              <option value="iban">IBAN / Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="bar">Bar Tab</option>
            </select>
          </div>

          {formData.payment_method === 'iban' && (
            <>
              <div style={styles.formGroup}>
                <label style={styles.label}>Account Holder Name *</label>
                <input
                  type="text"
                  name="member_name"
                  value={formData.member_name}
                  onChange={handleInputChange}
                  required
                  placeholder="Name as it appears on bank account"
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>IBAN *</label>
                <input
                  type="text"
                  name="iban"
                  value={formData.iban}
                  onChange={handleInputChange}
                  required
                  placeholder="BE00 0000 0000 0000"
                  style={styles.input}
                />
              </div>
            </>
          )}

          {formData.payment_method === 'bar' && (
            <div style={styles.formGroup}>
              <label style={styles.label}>Bar Tab Name *</label>
              <input
                type="text"
                name="member_name"
                value={formData.member_name}
                onChange={handleInputChange}
                required
                placeholder="Name the tab is under"
                style={styles.input}
              />
            </div>
          )}

          <div style={styles.formGroup}>
            <label style={styles.label}>Date Entered</label>
            <input
              type="text"
              value={new Date().toLocaleDateString()}
              disabled
              style={{...styles.input, ...styles.inputDisabled}}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              rows="4"
              style={{...styles.input, ...styles.textarea}}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Amount (EUR) *</label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              step="0.01"
              min="0"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Email *</label>
            <input
              type="email"
              name="member_email"
              value={formData.member_email}
              onChange={handleInputChange}
              required
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Upload Receipt Photos</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoChange}
              style={styles.fileInput}
            />
            {photos.length > 0 && (
              <div style={styles.fileList}>
                {photos.map((photo, index) => (
                  <div key={index} style={styles.fileName}>
                    {index + 1}. {photo.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              ...(loading ? styles.buttonDisabled : {})
            }}
          >
            {loading ? 'Submitting...' : 'Submit Expense'}
          </button>

          {success && (
            <div style={styles.successMessage}>
              Expense submitted successfully! You will receive an email confirmation.
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    padding: '2rem 1rem',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  card: {
    backgroundColor: 'rgb(31, 41, 55)',
    borderRadius: '0.75rem',
    padding: '2rem',
    maxWidth: '600px',
    width: '100%',
    border: '1px solid rgb(55, 65, 81)',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '600',
    marginBottom: '1rem',
    color: 'rgb(255, 173, 179)',
  },
  usernameDisplay: {
    padding: '0.75rem 1rem',
    backgroundColor: 'rgba(255, 173, 179, 0.1)',
    border: '1px solid rgba(255, 173, 179, 0.3)',
    borderRadius: '0.375rem',
    color: 'rgb(243, 244, 246)',
    marginBottom: '1.5rem',
    fontSize: '0.875rem',
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
    transition: 'border-color 0.2s',
  },
  inputDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  select: {
    padding: '0.75rem',
    backgroundColor: 'rgb(17, 24, 39)',
    border: '1px solid rgb(55, 65, 81)',
    borderRadius: '0.375rem',
    color: 'rgb(243, 244, 246)',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  textarea: {
    resize: 'vertical',
    minHeight: '100px',
  },
  fileInput: {
    padding: '0.5rem',
    backgroundColor: 'rgb(17, 24, 39)',
    border: '1px solid rgb(55, 65, 81)',
    borderRadius: '0.375rem',
    color: 'rgb(243, 244, 246)',
    cursor: 'pointer',
  },
  fileList: {
    marginTop: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  fileName: {
    fontSize: '0.875rem',
    color: 'rgb(156, 163, 175)',
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
    marginTop: '1rem',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  successMessage: {
    padding: '1rem',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    borderRadius: '0.375rem',
    color: 'rgb(34, 197, 94)',
    marginBottom: '1.5rem',
  },
  errorMessage: {
    padding: '1rem',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '0.375rem',
    color: 'rgb(239, 68, 68)',
    marginBottom: '1.5rem',
  },
};

export default ExpenseForm;
