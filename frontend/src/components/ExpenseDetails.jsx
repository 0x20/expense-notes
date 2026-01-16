import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import PhotoGallery from './PhotoGallery';
import { adminAPI } from '../services/api';

const ExpenseDetails = ({ expense, onUpdate }) => {
  // Auto-enable edit mode if status is pending
  const [editMode, setEditMode] = useState(expense.status === 'pending');
  const [previousExpenseId, setPreviousExpenseId] = useState(expense.id);

  // Determine if paid_to is a preset value or custom
  const getPaidToType = (value) => {
    if (!value || value === 'IBAN') return 'IBAN';
    return 'Other';
  };

  // Get default payment fields based on expense payment method
  const getDefaultPaidFrom = (exp) => {
    if (exp.paid_from) return exp.paid_from;
    if (exp.payment_method === 'bar') return 'Bar';
    return 'KBC';
  };

  const getDefaultPaidTo = (exp) => {
    if (exp.paid_to) return getPaidToType(exp.paid_to);
    if (exp.payment_method === 'bar') return 'Other';
    return 'IBAN';
  };

  const getDefaultPaidToOther = (exp) => {
    if (exp.paid_to && exp.paid_to !== 'IBAN') return exp.paid_to;
    if (exp.payment_method === 'bar' && !exp.paid_to) return exp.member_name || '';
    return '';
  };

  const [formData, setFormData] = useState({
    pay_date: expense.pay_date ? new Date(expense.pay_date) : null,
    paid_from: getDefaultPaidFrom(expense),
    paid_from_other: expense.paid_from && !['KBC', 'Cash', 'Bar'].includes(expense.paid_from) ? expense.paid_from : '',
    paid_to: getDefaultPaidTo(expense),
    paid_to_other: getDefaultPaidToOther(expense),
    financial_responsible: expense.financial_responsible || '',
    admin_notes: expense.admin_notes || '',
  });

  // Update form data when expense prop changes
  useEffect(() => {
    setFormData({
      pay_date: expense.pay_date ? new Date(expense.pay_date) : null,
      paid_from: getDefaultPaidFrom(expense),
      paid_from_other: expense.paid_from && !['KBC', 'Cash', 'Bar'].includes(expense.paid_from) ? expense.paid_from : '',
      paid_to: getDefaultPaidTo(expense),
      paid_to_other: getDefaultPaidToOther(expense),
      financial_responsible: expense.financial_responsible || '',
      admin_notes: expense.admin_notes || '',
    });

    // Only reset edit mode when switching to a different expense
    if (expense.id !== previousExpenseId) {
      setEditMode(expense.status === 'pending');
      setPreviousExpenseId(expense.id);
    }
  }, [expense, previousExpenseId]);

  const isLocked = expense.status !== 'pending';
  const showPaidFromOther = formData.paid_from === 'Other';
  const showPaidToOther = formData.paid_to === 'Other';
  const [uploading, setUploading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleInputChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value
    });
  };

  const validateAndPrepareData = () => {
    const submitData = { ...formData };

    // Convert Date object to ISO string for pay_date
    if (submitData.pay_date) {
      submitData.pay_date = submitData.pay_date.toISOString();
    }

    // Validate "Other" option for paid_from
    if (submitData.paid_from === 'Other') {
      if (!submitData.paid_from_other || submitData.paid_from_other.trim() === '') {
        alert('Please specify the payment source when "Other" is selected.');
        return null;
      }
      submitData.paid_from = submitData.paid_from_other;
    }

    // Validate "Other" option for paid_to
    if (submitData.paid_to === 'Other') {
      if (!submitData.paid_to_other || submitData.paid_to_other.trim() === '') {
        alert('Please specify the payment destination when "Other" is selected.');
        return null;
      }
      submitData.paid_to = submitData.paid_to_other;
    }

    // Remove the temporary fields
    delete submitData.paid_from_other;
    delete submitData.paid_to_other;

    return submitData;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const submitData = validateAndPrepareData();
    if (!submitData) return;

    await onUpdate(expense.id, submitData);
  };

  const handlePaid = async () => {
    const submitData = validateAndPrepareData();
    if (!submitData) return;

    submitData.status = 'paid';
    await onUpdate(expense.id, submitData);
  };

  const handleDeny = async () => {
    const submitData = validateAndPrepareData();
    if (!submitData) return;

    submitData.status = 'denied';
    await onUpdate(expense.id, submitData);
  };

  const toggleEdit = () => {
    if (isLocked) {
      setEditMode(!editMode);
    }
  };

  const handleAttachmentChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);

      // Upload immediately
      setUploading(true);
      try {
        const formData = new FormData();
        files.forEach(file => {
          formData.append('attachments', file);
        });

        await adminAPI.uploadAttachments(expense.id, formData);
        await onUpdate(expense.id, {});
        // Success - files now appear in gallery
      } catch (err) {
        console.error('Failed to upload files:', err);
        alert('Failed to upload files: ' + (err.response?.data?.detail || err.message));
      } finally {
        setUploading(false);
      }
    }
    // Reset input value so same file can be selected again
    e.target.value = '';
  };


  const handlePhotoDelete = async (filename) => {
    try {
      await adminAPI.deletePhoto(expense.id, filename);
      await onUpdate(expense.id, {});
    } catch (err) {
      console.error('Failed to delete photo:', err);
      alert('Failed to delete photo');
    }
  };

  const handleDeleteExpense = async () => {
    try {
      await adminAPI.softDeleteExpense(expense.id);
      await onUpdate(expense.id, {});
      setShowDeleteModal(false);
    } catch (err) {
      console.error('Failed to delete expense:', err);
      alert('Failed to delete expense');
    }
  };

  const handleRestoreExpense = async () => {
    try {
      await adminAPI.restoreExpense(expense.id);
      await onUpdate(expense.id, {});
    } catch (err) {
      console.error('Failed to restore expense:', err);
      alert('Failed to restore expense');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Expense Details</h2>
      </div>

      <div style={styles.content}>
        {/* Member & Expense Information - Condensed */}
        <div style={styles.infoSection}>
          <div style={styles.infoGrid} className="info-grid-mobile">
            {expense.mattermost_username && (
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Mattermost:</span>
                <span style={styles.infoValue}>@{expense.mattermost_username}</span>
              </div>
            )}
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Member:</span>
              <span style={styles.infoValue}>{expense.member_name || '-'}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Email:</span>
              <span style={styles.infoValue}>{expense.member_email}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Date:</span>
              <span style={styles.infoValue}>
                {format(new Date(expense.date_entered), 'yyyy/MM/dd')}
              </span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Amount:</span>
              <span style={{...styles.infoValue, ...styles.amount}}>
                €{parseFloat(expense.amount).toFixed(2)}
              </span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Payment Method:</span>
              <span style={styles.infoValue}>
                {expense.payment_method === 'iban' ? 'IBAN / Bank Transfer' : expense.payment_method === 'cash' ? 'Cash' : expense.payment_method === 'bar' ? 'Bar Tab' : expense.payment_method || '-'}
              </span>
            </div>
            {expense.payment_method === 'iban' && expense.iban && (
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>IBAN:</span>
                <span style={styles.infoValue}>{expense.iban}</span>
              </div>
            )}
          </div>
          <div style={styles.descriptionBox}>
            <span style={styles.infoLabel}>Description:</span>
            <span style={styles.infoValue}>{expense.description}</span>
          </div>
        </div>

        {/* Photos */}
        {(expense.photo_paths || expense.attachment_paths || editMode) && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Receipt Photos</h3>
            <div style={styles.photoGallery}>
              {/* Existing photos */}
              <PhotoGallery
                photoPaths={[expense.photo_paths, expense.attachment_paths].filter(Boolean).join(',')}
                title=""
                editable={editMode}
                onDelete={handlePhotoDelete}
              />

              {/* Upload button tile */}
              {editMode && !uploading && (
                <>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    onChange={handleAttachmentChange}
                    style={styles.hiddenInput}
                    id="photo-upload-input"
                    disabled={uploading}
                  />
                  <label
                    htmlFor="photo-upload-input"
                    style={styles.uploadTile}
                  >
                    <span style={styles.uploadIcon}>+</span>
                    <span style={styles.uploadText}>Add Upload</span>
                  </label>
                </>
              )}

              {/* Loading indicator */}
              {editMode && uploading && (
                <div style={styles.uploadingTile}>
                  <span style={styles.uploadingIcon}>⏳</span>
                  <span style={styles.uploadingText}>Uploading...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Admin Section */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            {isLocked && !editMode && (
              <button onClick={toggleEdit} style={styles.editButton}>
                Edit
              </button>
            )}
            {isLocked && editMode && (
              <button onClick={toggleEdit} style={styles.editButton}>
                Cancel
              </button>
            )}
          </div>

          {editMode ? (
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Pay Date</label>
                <DatePicker
                  selected={formData.pay_date}
                  onChange={(date) => setFormData({...formData, pay_date: date})}
                  dateFormat="yyyy/MM/dd"
                  placeholderText="YYYY/MM/DD"
                  customInput={<input style={styles.input} />}
                  showPopperArrow={false}
                  popperClassName="date-picker-popper"
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Paid From</label>
                  <select
                    name="paid_from"
                    value={formData.paid_from}
                    onChange={handleInputChange}
                    style={styles.select}
                  >
                    <option value="KBC">KBC</option>
                    <option value="Cash">Cash</option>
                    <option value="Bar">Bar</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Paid To</label>
                  <select
                    name="paid_to"
                    value={formData.paid_to}
                    onChange={handleInputChange}
                    style={styles.select}
                  >
                    <option value="IBAN">IBAN</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {showPaidFromOther && (
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Paid From (specify)</label>
                  <input
                    type="text"
                    name="paid_from_other"
                    value={formData.paid_from_other}
                    onChange={handleInputChange}
                    placeholder="Enter payment source"
                    style={styles.input}
                  />
                </div>
              )}

              {showPaidToOther && (
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Paid To (specify)</label>
                  <input
                    type="text"
                    name="paid_to_other"
                    value={formData.paid_to_other}
                    onChange={handleInputChange}
                    placeholder="Enter payment destination"
                    style={styles.input}
                  />
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Financial Responsible</label>
                <input
                  type="text"
                  name="financial_responsible"
                  value={formData.financial_responsible}
                  onChange={handleInputChange}
                  placeholder="Name of person signing off"
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Message to User</label>
                <textarea
                  name="admin_notes"
                  value={formData.admin_notes}
                  onChange={handleInputChange}
                  rows="4"
                  placeholder="This message will be visible to the user"
                  style={{...styles.input, ...styles.textarea}}
                />
              </div>

              <div style={styles.actionButtons}>
                <button
                  type="button"
                  onClick={handlePaid}
                  style={{...styles.actionButton, ...styles.paidButton}}
                >
                  Mark as Paid
                </button>
                <button
                  type="button"
                  onClick={handleDeny}
                  style={{...styles.actionButton, ...styles.denyButton}}
                >
                  Deny
                </button>
                <button type="submit" style={{...styles.actionButton, ...styles.saveButton}}>
                  Save (Keep {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)})
                </button>
                {!expense.deleted ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    style={{...styles.actionButton, ...styles.deleteNoteButton}}
                  >
                    Delete Note
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleRestoreExpense}
                    style={{...styles.actionButton, ...styles.restoreNoteButton}}
                  >
                    Restore Note
                  </button>
                )}
              </div>
            </form>
          ) : (
            <>
              <div style={styles.field}>
                <span style={styles.label}>Status:</span>
                <span style={{
                  ...styles.statusBadge,
                  ...styles[`status${expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}`]
                }}>
                  {expense.status}
                </span>
              </div>
              {expense.pay_date && (
                <div style={styles.field}>
                  <span style={styles.label}>Pay Date:</span>
                  <span style={styles.value}>
                    {format(new Date(expense.pay_date), 'MMM dd, yyyy')}
                  </span>
                </div>
              )}
              {expense.paid_from && (
                <div style={styles.field}>
                  <span style={styles.label}>Paid From:</span>
                  <span style={styles.value}>{expense.paid_from}</span>
                </div>
              )}
              {expense.paid_to && (
                <div style={styles.field}>
                  <span style={styles.label}>Paid To:</span>
                  <span style={styles.value}>{expense.paid_to}</span>
                </div>
              )}
              {expense.financial_responsible && (
                <div style={styles.field}>
                  <span style={styles.label}>Financial Responsible:</span>
                  <span style={styles.value}>{expense.financial_responsible}</span>
                </div>
              )}
              {expense.admin_notes && (
                <div style={styles.field}>
                  <span style={styles.label}>Message to User:</span>
                  <span style={styles.value}>{expense.admin_notes}</span>
                </div>
              )}
              {expense.deleted && (
                <div style={styles.restoreButtonContainer}>
                  <button
                    type="button"
                    onClick={handleRestoreExpense}
                    style={styles.restoreButtonStandalone}
                  >
                    Restore Note
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Delete Expense Note</h3>
            <p style={styles.modalText}>Are you sure you want to delete this expense note? It will be greyed out and can be restored later.</p>
            <div style={styles.modalActions}>
              <button onClick={handleDeleteExpense} style={styles.modalDeleteButton}>
                Delete
              </button>
              <button onClick={() => setShowDeleteModal(false)} style={styles.modalCancelButton}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: 'rgb(31, 41, 55)',
    border: '1px solid rgb(255, 173, 179)',
    borderRadius: '0.75rem',
    padding: '2rem',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  header: {
    marginBottom: '2rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: 'rgb(255, 173, 179)',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  infoSection: {
    backgroundColor: 'rgb(17, 24, 39)',
    border: '1px solid rgb(55, 65, 81)',
    borderRadius: '0.5rem',
    padding: '1rem',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.75rem',
    marginBottom: '0.75rem',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  infoLabel: {
    color: 'rgb(156, 163, 175)',
    fontSize: '0.75rem',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  infoValue: {
    color: 'rgb(243, 244, 246)',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
  descriptionBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    paddingTop: '0.75rem',
    borderTop: '1px solid rgb(55, 65, 81)',
  },
  section: {
    borderBottom: '1px solid rgb(55, 65, 81)',
    paddingBottom: '1.5rem',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: 'rgb(243, 244, 246)',
    marginBottom: '1rem',
  },
  photoGallery: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '1rem',
  },
  uploadTile: {
    border: '2px dashed rgb(55, 65, 81)',
    borderRadius: '0.375rem',
    backgroundColor: 'rgb(17, 24, 39)',
    aspectRatio: '4 / 3',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  uploadingTile: {
    border: '2px dashed rgb(255, 173, 179)',
    borderRadius: '0.375rem',
    backgroundColor: 'rgb(17, 24, 39)',
    aspectRatio: '4 / 3',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIcon: {
    fontSize: '3rem',
    color: 'rgb(255, 173, 179)',
    fontWeight: '300',
    lineHeight: '1',
  },
  uploadText: {
    fontSize: '0.875rem',
    color: 'rgb(156, 163, 175)',
    marginTop: '0.5rem',
  },
  uploadingIcon: {
    fontSize: '3rem',
    lineHeight: '1',
  },
  uploadingText: {
    fontSize: '0.875rem',
    color: 'rgb(255, 173, 179)',
    marginTop: '0.5rem',
    fontWeight: '600',
  },
  field: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 0',
  },
  label: {
    color: 'rgb(156, 163, 175)',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
  value: {
    color: 'rgb(243, 244, 246)',
    fontSize: '0.875rem',
  },
  amount: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: 'rgb(255, 173, 179)',
  },
  editButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'rgb(31, 41, 55)',
    color: 'rgb(243, 244, 246)',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    cursor: 'pointer',
    border: '1px solid rgb(55, 65, 81)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  formRow: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    flex: 1,
    minWidth: '200px',
  },
  formLabel: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: 'rgb(243, 244, 246)',
  },
  input: {
    padding: '0.5rem',
    backgroundColor: 'rgb(17, 24, 39)',
    border: '1px solid rgb(55, 65, 81)',
    borderRadius: '0.375rem',
    color: 'rgb(243, 244, 246)',
    fontSize: '0.875rem',
  },
  select: {
    padding: '0.5rem',
    backgroundColor: 'rgb(17, 24, 39)',
    border: '1px solid rgb(55, 65, 81)',
    borderRadius: '0.375rem',
    color: 'rgb(243, 244, 246)',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
  textarea: {
    resize: 'vertical',
    minHeight: '80px',
  },
  submitButton: {
    padding: '0.75rem',
    backgroundColor: 'rgb(255, 173, 179)',
    color: 'rgb(17, 24, 39)',
    fontSize: '1rem',
    fontWeight: '600',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    marginTop: '1rem',
  },
  actionButtons: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '1.5rem',
    flexWrap: 'wrap',
  },
  actionButton: {
    flex: 1,
    minWidth: '120px',
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textTransform: 'none',
  },
  paidButton: {
    backgroundColor: 'transparent',
    color: 'rgb(243, 244, 246)',
    border: '1px solid rgb(34, 197, 94)',
  },
  denyButton: {
    backgroundColor: 'transparent',
    color: 'rgb(243, 244, 246)',
    border: '1px solid rgb(239, 68, 68)',
  },
  saveButton: {
    backgroundColor: 'transparent',
    color: 'rgb(243, 244, 246)',
    border: '1px solid rgb(59, 130, 246)',
  },
  hiddenInput: {
    display: 'none',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
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
  deleteExpenseButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'transparent',
    color: 'rgb(243, 244, 246)',
    border: '1px solid rgb(239, 68, 68)',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
  deleteNoteButton: {
    backgroundColor: 'transparent',
    color: 'rgb(243, 244, 246)',
    border: '1px solid rgb(239, 68, 68)',
  },
  restoreButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'transparent',
    color: 'rgb(243, 244, 246)',
    border: '1px solid rgb(34, 197, 94)',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
  restoreNoteButton: {
    backgroundColor: 'transparent',
    color: 'rgb(243, 244, 246)',
    border: '1px solid rgb(34, 197, 94)',
  },
  restoreButtonContainer: {
    marginTop: '1.5rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid rgb(55, 65, 81)',
  },
  restoreButtonStandalone: {
    padding: '0.75rem 1.5rem',
    backgroundColor: 'transparent',
    color: 'rgb(243, 244, 246)',
    border: '1px solid rgb(34, 197, 94)',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'rgb(31, 41, 55)',
    border: '1px solid rgb(55, 65, 81)',
    borderRadius: '0.75rem',
    padding: '2rem',
    maxWidth: '400px',
    width: '90%',
  },
  modalTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: 'rgb(255, 173, 179)',
    marginBottom: '1rem',
  },
  modalText: {
    color: 'rgb(243, 244, 246)',
    marginBottom: '1.5rem',
    fontSize: '0.875rem',
  },
  modalActions: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'flex-end',
  },
  modalDeleteButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: 'transparent',
    color: 'rgb(243, 244, 246)',
    border: '1px solid rgb(239, 68, 68)',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '0.875rem',
  },
  modalCancelButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: 'rgb(55, 65, 81)',
    color: 'rgb(243, 244, 246)',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '0.875rem',
  },
};

export default ExpenseDetails;
