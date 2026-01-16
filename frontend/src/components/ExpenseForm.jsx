import React, { useState, useRef } from 'react';
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

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const isDevelopment = import.meta.env.DEV;

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setPhotos(prev => [...prev, ...newFiles]);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
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

      if (photos.length > 0) {
        photos.forEach(photo => {
          submitData.append('photos', photo);
        });
      }

      await expenseAPI.submitExpense(submitData, accessToken);

      setSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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

  if (!isDevelopment && !accessToken) {
    return (
      <div className="expense-form-container">
        <div className="expense-form-card">
          <h1 style={styles.title}>Access Required</h1>
          <div style={styles.errorMessage}>
            Use the <strong>/expenses</strong> command in Mattermost to get your personal submission link.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="expense-form-container">
      <div className="expense-form-card">
        <h1 style={styles.title}>Submit Expense</h1>

        {mattermostUsername && (
          <div style={styles.usernameDisplay}>
            Submitting as <strong>@{mattermostUsername}</strong>
          </div>
        )}

        {error && (
          <div style={styles.errorMessage}>{error}</div>
        )}

        {success ? (
          <div style={styles.successCard}>
            <div style={styles.successIcon}>✓</div>
            <h2 style={styles.successTitle}>Expense Submitted</h2>
            <p style={styles.successText}>
              You'll receive a DM when it's been processed.
            </p>
            <button
              onClick={() => setSuccess(false)}
              style={styles.newExpenseButton}
            >
              Submit Another
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            {/* Payment Method */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Payment Method</label>
              <div style={styles.segmentedControl}>
                {[
                  { value: 'iban', label: 'Bank Transfer' },
                  { value: 'cash', label: 'Cash' },
                  { value: 'bar', label: 'Bar Tab' }
                ].map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, payment_method: option.value })}
                    style={{
                      ...styles.segmentButton,
                      ...(formData.payment_method === option.value ? styles.segmentButtonActive : {})
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Conditional fields based on payment method */}
            {formData.payment_method === 'iban' && (
              <>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Account Holder Name</label>
                  <input
                    type="text"
                    name="member_name"
                    value={formData.member_name}
                    onChange={handleInputChange}
                    required
                    placeholder="Name on bank account"
                    style={styles.input}
                    autoComplete="name"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>IBAN</label>
                  <input
                    type="text"
                    name="iban"
                    value={formData.iban}
                    onChange={handleInputChange}
                    required
                    placeholder="BE00 0000 0000 0000"
                    style={styles.input}
                    autoComplete="off"
                  />
                </div>
              </>
            )}

            {formData.payment_method === 'bar' && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Bar Tab Name</label>
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

            {/* Amount - prominent on mobile */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Amount (EUR)</label>
              <div style={styles.amountWrapper}>
                <span style={styles.currencySymbol}>€</span>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'e' || e.key === 'E') {
                      e.preventDefault();
                    }
                  }}
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  style={styles.amountInput}
                  inputMode="decimal"
                />
              </div>
            </div>

            {/* Description */}
            <div style={styles.formGroup}>
              <label style={styles.label}>What's this for?</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows="3"
                placeholder="e.g., Pizza for workshop, Soldering supplies..."
                style={styles.textarea}
              />
            </div>

            {/* Email */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                name="member_email"
                value={formData.member_email}
                onChange={handleInputChange}
                required
                placeholder="your@email.com"
                style={styles.input}
                autoComplete="email"
                inputMode="email"
              />
            </div>

            {/* Photo Upload - Mobile optimized */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Receipt Photos</label>

              {/* Photo previews */}
              {photos.length > 0 && (
                <div style={styles.photoGrid}>
                  {photos.map((photo, index) => (
                    <div key={index} style={styles.photoPreview}>
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Receipt ${index + 1}`}
                        style={styles.previewImage}
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        style={styles.removePhotoButton}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload buttons */}
              <div style={styles.uploadButtons}>
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  style={styles.uploadButton}
                >
                  <span style={styles.uploadIcon}>📷</span>
                  <span>Take Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={styles.uploadButton}
                >
                  <span style={styles.uploadIcon}>📁</span>
                  <span>Choose File</span>
                </button>
              </div>

              {/* Hidden file inputs */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                multiple
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.submitButton,
                ...(loading ? styles.submitButtonDisabled : {})
              }}
            >
              {loading ? 'Submitting...' : 'Submit Expense'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

const styles = {
  title: {
    fontSize: '1.5rem',
    fontWeight: '600',
    marginBottom: '1rem',
    color: 'rgb(255, 173, 179)',
    textAlign: 'center',
  },
  usernameDisplay: {
    padding: '0.75rem',
    backgroundColor: 'rgba(255, 173, 179, 0.1)',
    border: '1px solid rgba(255, 173, 179, 0.3)',
    borderRadius: '0.5rem',
    color: 'rgb(243, 244, 246)',
    marginBottom: '1.5rem',
    fontSize: '0.875rem',
    textAlign: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: 'rgb(156, 163, 175)',
  },
  input: {
    padding: '0.875rem',
    backgroundColor: 'rgb(17, 24, 39)',
    border: '1px solid rgb(55, 65, 81)',
    borderRadius: '0.5rem',
    color: 'rgb(243, 244, 246)',
    fontSize: '1rem',
    outline: 'none',
    WebkitAppearance: 'none',
    minHeight: '48px',
  },
  textarea: {
    padding: '0.875rem',
    backgroundColor: 'rgb(17, 24, 39)',
    border: '1px solid rgb(55, 65, 81)',
    borderRadius: '0.5rem',
    color: 'rgb(243, 244, 246)',
    fontSize: '1rem',
    outline: 'none',
    resize: 'vertical',
    minHeight: '80px',
    fontFamily: 'inherit',
  },
  segmentedControl: {
    display: 'flex',
    gap: '0.5rem',
  },
  segmentButton: {
    flex: 1,
    padding: '0.75rem 0.5rem',
    backgroundColor: 'rgb(17, 24, 39)',
    border: '1px solid rgb(55, 65, 81)',
    borderRadius: '0.5rem',
    color: 'rgb(156, 163, 175)',
    fontSize: '0.875rem',
    cursor: 'pointer',
    minHeight: '48px',
    transition: 'all 0.2s',
  },
  segmentButtonActive: {
    backgroundColor: 'rgb(255, 173, 179)',
    borderColor: 'rgb(255, 173, 179)',
    color: 'rgb(17, 24, 39)',
    fontWeight: '600',
  },
  amountWrapper: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'rgb(17, 24, 39)',
    border: '1px solid rgb(55, 65, 81)',
    borderRadius: '0.5rem',
    overflow: 'hidden',
  },
  currencySymbol: {
    padding: '0.875rem',
    color: 'rgb(156, 163, 175)',
    fontSize: '1.25rem',
    fontWeight: '600',
    backgroundColor: 'rgb(31, 41, 55)',
    borderRight: '1px solid rgb(55, 65, 81)',
  },
  amountInput: {
    flex: 1,
    padding: '0.875rem',
    backgroundColor: 'transparent',
    border: 'none',
    color: 'rgb(243, 244, 246)',
    fontSize: '1.25rem',
    fontWeight: '600',
    outline: 'none',
    minHeight: '48px',
    WebkitAppearance: 'none',
  },
  photoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.5rem',
    marginBottom: '0.75rem',
  },
  photoPreview: {
    position: 'relative',
    aspectRatio: '1',
    borderRadius: '0.5rem',
    overflow: 'hidden',
    backgroundColor: 'rgb(17, 24, 39)',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  removePhotoButton: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    border: 'none',
    fontSize: '1rem',
    lineHeight: '1',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtons: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem',
  },
  uploadButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '1rem',
    backgroundColor: 'rgb(17, 24, 39)',
    border: '2px dashed rgb(55, 65, 81)',
    borderRadius: '0.5rem',
    color: 'rgb(156, 163, 175)',
    fontSize: '0.875rem',
    cursor: 'pointer',
    minHeight: '80px',
    transition: 'all 0.2s',
  },
  uploadIcon: {
    fontSize: '1.5rem',
  },
  submitButton: {
    padding: '1rem',
    backgroundColor: 'rgb(255, 173, 179)',
    color: 'rgb(17, 24, 39)',
    fontSize: '1rem',
    fontWeight: '600',
    borderRadius: '0.5rem',
    border: 'none',
    cursor: 'pointer',
    minHeight: '56px',
    marginTop: '0.5rem',
  },
  submitButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  successCard: {
    textAlign: 'center',
    padding: '2rem 1rem',
  },
  successIcon: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    color: 'rgb(34, 197, 94)',
    fontSize: '2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1rem',
  },
  successTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: 'rgb(243, 244, 246)',
    marginBottom: '0.5rem',
  },
  successText: {
    color: 'rgb(156, 163, 175)',
    marginBottom: '1.5rem',
  },
  newExpenseButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: 'transparent',
    border: '1px solid rgb(255, 173, 179)',
    borderRadius: '0.5rem',
    color: 'rgb(255, 173, 179)',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
  },
  errorMessage: {
    padding: '1rem',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '0.5rem',
    color: 'rgb(239, 68, 68)',
    marginBottom: '1rem',
    textAlign: 'center',
  },
};

export default ExpenseForm;
