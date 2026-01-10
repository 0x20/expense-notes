import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { format } from 'date-fns';
import { adminAPI } from '../services/api';
import ExpenseList from './ExpenseList';
import ExpenseDetails from './ExpenseDetails';

const AdminDashboard = ({ onLogout }) => {
  const [expenses, setExpenses] = useState([]);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportStatuses, setExportStatuses] = useState({
    pending: false,
    paid: true,
    denied: false
  });

  useEffect(() => {
    loadExpenses();
  }, [filter]);

  const loadExpenses = async () => {
    try {
      const filterStatus = filter === 'all' ? null : filter;
      const data = await adminAPI.listExpenses(filterStatus);
      // Sort by newest first
      const sortedData = data.sort((a, b) =>
        new Date(b.date_entered) - new Date(a.date_entered)
      );
      setExpenses(sortedData);

      // Auto-select first expense if none selected or if selected expense is not in new list
      if (sortedData.length > 0) {
        if (!selectedExpense || !sortedData.find(e => e.id === selectedExpense.id)) {
          setSelectedExpense(sortedData[0]);
        } else {
          // If the selected expense is still in the list, update it with fresh data
          const updatedExpense = sortedData.find(e => e.id === selectedExpense.id);
          setSelectedExpense(updatedExpense);
        }
      } else {
        setSelectedExpense(null);
      }
    } catch (err) {
      console.error('Failed to load expenses:', err);
      if (err.response?.status === 401) {
        onLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExpenseUpdate = async (expenseId, updateData) => {
    try {
      await adminAPI.updateExpense(expenseId, updateData);
      // Reload expenses - the auto-select logic in loadExpenses will handle
      // whether to keep this expense selected or select a different one
      await loadExpenses();
    } catch (err) {
      console.error('Failed to update expense:', err);
    }
  };

  const loadFileAsArrayBuffer = async (url) => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!response.ok) throw new Error('Failed to load');
      return await response.arrayBuffer();
    } catch (error) {
      console.error('Failed to load file:', url, error);
      return null;
    }
  };

  const handleExportPDF = async () => {
    console.log('Export PDF clicked', { startDate, endDate });

    if (!startDate || !endDate) {
      alert('Please select both start and end dates');
      return;
    }

    // Filter expenses by date range and status
    const selectedStatuses = Object.keys(exportStatuses).filter(status => exportStatuses[status]);
    const filteredExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date_entered);
      const inDateRange = expenseDate >= startDate && expenseDate <= endDate;
      const matchesStatus = selectedStatuses.includes(expense.status);
      return inDateRange && matchesStatus;
    });

    console.log('Filtered expenses:', filteredExpenses.length);

    if (filteredExpenses.length === 0) {
      alert('No expenses found in the selected date range');
      return;
    }

    try {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      for (let i = 0; i < filteredExpenses.length; i++) {
        const expense = filteredExpenses[i];
        let page = pdfDoc.addPage();
        const { width, height } = page.getSize();
        const margin = 50;
        let yPos = height - margin;

        // Title
        page.drawText('Expense Note', { x: margin, y: yPos, size: 16, font: fontBold });
        yPos -= 25;

        // Member Information
        page.drawText(`Member: ${expense.member_name}`, { x: margin, y: yPos, size: 10, font });
        yPos -= 15;
        page.drawText(`Email: ${expense.member_email}`, { x: margin, y: yPos, size: 10, font });
        yPos -= 15;
        page.drawText(`Date: ${format(new Date(expense.date_entered), 'yyyy/MM/dd')}`, { x: margin, y: yPos, size: 10, font });
        yPos -= 15;
        page.drawText(`Amount: €${parseFloat(expense.amount).toFixed(2)}`, { x: margin, y: yPos, size: 10, font: fontBold });
        yPos -= 15;
        page.drawText(`Description: ${expense.description}`, { x: margin, y: yPos, size: 10, font });
        yPos -= 25;

        // Admin Information
        if (expense.status !== 'pending') {
          page.drawText('Admin Information', { x: margin, y: yPos, size: 10, font: fontBold });
          yPos -= 15;
          page.drawText(`Status: ${expense.status.toUpperCase()}`, { x: margin, y: yPos, size: 10, font });
          yPos -= 15;
          if (expense.pay_date) {
            page.drawText(`Pay Date: ${format(new Date(expense.pay_date), 'yyyy/MM/dd')}`, { x: margin, y: yPos, size: 10, font });
            yPos -= 15;
          }
          if (expense.paid_from) {
            page.drawText(`Paid From: ${expense.paid_from}`, { x: margin, y: yPos, size: 10, font });
            yPos -= 15;
          }
          if (expense.paid_to) {
            page.drawText(`Paid To: ${expense.paid_to}`, { x: margin, y: yPos, size: 10, font });
            yPos -= 15;
          }
          if (expense.financial_responsible) {
            page.drawText(`Financial Responsible: ${expense.financial_responsible}`, { x: margin, y: yPos, size: 10, font });
            yPos -= 15;
          }
          if (expense.admin_notes) {
            page.drawText(`Notes: ${expense.admin_notes}`, { x: margin, y: yPos, size: 10, font });
            yPos -= 15;
          }
          yPos -= 10;
        }

        // Receipt Photos and PDFs
        const allPhotos = [expense.photo_paths, expense.attachment_paths]
          .filter(Boolean)
          .join(',')
          .split(',')
          .filter(p => p.trim());

        if (allPhotos.length > 0) {
          page.drawText('Receipt Photos:', { x: margin, y: yPos, size: 10, font: fontBold });
          yPos -= 15;

          for (const photoPath of allPhotos) {
            const trimmedPath = photoPath.trim();
            const isPDF = trimmedPath.toLowerCase().endsWith('.pdf');
            const fileUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/admin/files/${trimmedPath}`;

            if (isPDF) {
              // Load and merge PDF
              const pdfBytes = await loadFileAsArrayBuffer(fileUrl);
              if (pdfBytes) {
                try {
                  const attachedPdf = await PDFDocument.load(pdfBytes);
                  const copiedPages = await pdfDoc.copyPages(attachedPdf, attachedPdf.getPageIndices());
                  copiedPages.forEach((copiedPage) => {
                    pdfDoc.addPage(copiedPage);
                  });
                  page.drawText(`PDF: ${trimmedPath.split('/').pop()} (${copiedPages.length} pages inserted)`, { x: margin, y: yPos, size: 10, font });
                  yPos -= 15;
                } catch (pdfError) {
                  console.error('Failed to merge PDF:', pdfError);
                  page.drawText(`PDF: ${trimmedPath.split('/').pop()} (failed to merge)`, { x: margin, y: yPos, size: 10, font });
                  yPos -= 15;
                }
              }
            } else {
              // Load and embed image
              const imageBytes = await loadFileAsArrayBuffer(fileUrl);
              if (imageBytes) {
                try {
                  let image;
                  if (trimmedPath.toLowerCase().endsWith('.png')) {
                    image = await pdfDoc.embedPng(imageBytes);
                  } else {
                    image = await pdfDoc.embedJpg(imageBytes);
                  }

                  const imgDims = image.scale(1);
                  const maxWidth = width - (2 * margin);
                  const maxHeight = 400;

                  // Calculate dimensions maintaining aspect ratio
                  const aspectRatio = imgDims.height / imgDims.width;
                  let imgWidth = Math.min(imgDims.width, maxWidth);
                  let imgHeight = imgWidth * aspectRatio;

                  if (imgHeight > maxHeight) {
                    imgHeight = maxHeight;
                    imgWidth = imgHeight / aspectRatio;
                  }

                  // Check if we need a new page
                  if (yPos - imgHeight < margin) {
                    page = pdfDoc.addPage();
                    yPos = height - margin;
                  }

                  // Draw image
                  page.drawImage(image, {
                    x: margin,
                    y: yPos - imgHeight,
                    width: imgWidth,
                    height: imgHeight,
                  });
                  yPos -= imgHeight + 15;
                } catch (imgError) {
                  console.error('Failed to add image:', imgError);
                  page.drawText(`Image: ${trimmedPath.split('/').pop()} (failed to add)`, { x: margin, y: yPos, size: 10, font });
                  yPos -= 15;
                }
              }
            }
          }
        }

        // Page number on first page of each expense
        page.drawText(`Expense ${i + 1} of ${filteredExpenses.length}`, {
          x: width - margin - 80,
          y: margin - 20,
          size: 8,
          font,
        });
      }

      // Save PDF
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `expense-report-${format(startDate, 'yyyy-MM-dd')}-to-${format(endDate, 'yyyy-MM-dd')}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);

      setShowExportDialog(false);
      setStartDate(null);
      setEndDate(null);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF: ' + error.message);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.toolbar}>
        <div style={styles.filters}>
          {['all', 'pending', 'paid', 'denied', 'deleted'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              style={{
                ...styles.filterButton,
                ...(filter === status ? styles.filterButtonActive : {})
              }}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
        <div style={styles.actions}>
          <button onClick={() => setShowExportDialog(true)} style={styles.exportButton}>
            Export PDF
          </button>
          <button onClick={onLogout} style={styles.logoutButton}>
            Logout
          </button>
        </div>
      </div>

      {showExportDialog && (
        <div style={styles.exportDialog} onClick={() => setShowExportDialog(false)}>
          <div style={styles.exportDialogContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.exportTitle}>Export Expenses to PDF</h3>
            <div style={styles.dateRangePicker}>
              <div style={styles.datePickerGroup}>
                <label style={styles.dateLabel}>Start Date</label>
                <DatePicker
                  selected={startDate}
                  onChange={setStartDate}
                  dateFormat="yyyy/MM/dd"
                  placeholderText="YYYY/MM/DD"
                  customInput={<input style={styles.dateInput} />}
                  showPopperArrow={false}
                  popperClassName="date-picker-popper"
                />
              </div>
              <div style={styles.datePickerGroup}>
                <label style={styles.dateLabel}>End Date</label>
                <DatePicker
                  selected={endDate}
                  onChange={setEndDate}
                  dateFormat="yyyy/MM/dd"
                  placeholderText="YYYY/MM/DD"
                  customInput={<input style={styles.dateInput} />}
                  showPopperArrow={false}
                  popperClassName="date-picker-popper"
                />
              </div>
            </div>
            <div style={styles.statusFilterSection}>
              <label style={styles.statusFilterLabel}>Include Statuses:</label>
              <div style={styles.checkboxGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={exportStatuses.pending}
                    onChange={(e) => setExportStatuses({...exportStatuses, pending: e.target.checked})}
                    style={styles.checkbox}
                  />
                  <span style={styles.checkboxText}>Pending</span>
                </label>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={exportStatuses.paid}
                    onChange={(e) => setExportStatuses({...exportStatuses, paid: e.target.checked})}
                    style={styles.checkbox}
                  />
                  <span style={styles.checkboxText}>Paid</span>
                </label>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={exportStatuses.denied}
                    onChange={(e) => setExportStatuses({...exportStatuses, denied: e.target.checked})}
                    style={styles.checkbox}
                  />
                  <span style={styles.checkboxText}>Denied</span>
                </label>
              </div>
            </div>
            <div style={styles.exportActions}>
              <button type="button" onClick={handleExportPDF} style={styles.exportConfirmButton}>
                Generate PDF
              </button>
              <button type="button" onClick={() => setShowExportDialog(false)} style={styles.exportCancelButton}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.content} className="desktop-grid">
        <div style={styles.listPanel}>
          <ExpenseList
            expenses={expenses}
            loading={loading}
            onSelectExpense={setSelectedExpense}
            selectedExpenseId={selectedExpense?.id}
          />
        </div>

        <div style={styles.detailsPanel}>
          {selectedExpense ? (
            <ExpenseDetails
              expense={selectedExpense}
              onUpdate={handleExpenseUpdate}
            />
          ) : (
            <div style={styles.emptyState}>
              <p>Select an expense to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    padding: '2rem 1rem',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  filters: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  actions: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
  },
  filterButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'rgb(31, 41, 55)',
    color: 'rgb(243, 244, 246)',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    border: '1px solid rgb(55, 65, 81)',
    transition: 'all 0.2s',
  },
  filterButtonActive: {
    backgroundColor: 'rgb(255, 173, 179)',
    color: 'rgb(17, 24, 39)',
  },
  exportButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'rgb(255, 173, 179)',
    color: 'rgb(17, 24, 39)',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    border: 'none',
    fontWeight: '600',
  },
  logoutButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'rgb(55, 65, 81)',
    color: 'rgb(243, 244, 246)',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    border: 'none',
  },
  content: {
    display: 'grid',
    gridTemplateColumns: '1fr 2fr',
    gap: '2rem',
  },
  listPanel: {
    minHeight: '500px',
  },
  detailsPanel: {
    minHeight: '500px',
  },
  emptyState: {
    backgroundColor: 'rgb(31, 41, 55)',
    border: '1px solid rgb(55, 65, 81)',
    borderRadius: '0.75rem',
    padding: '4rem 2rem',
    textAlign: 'center',
    color: 'rgb(156, 163, 175)',
  },
  exportDialog: {
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
  exportDialogContent: {
    backgroundColor: 'rgb(31, 41, 55)',
    border: '1px solid rgb(55, 65, 81)',
    borderRadius: '0.75rem',
    padding: '2rem',
    maxWidth: '500px',
    width: '90%',
  },
  exportTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: 'rgb(255, 173, 179)',
    marginBottom: '1.5rem',
  },
  dateRangePicker: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
  },
  datePickerGroup: {
    flex: 1,
    minWidth: '180px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  dateLabel: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: 'rgb(243, 244, 246)',
  },
  dateInput: {
    padding: '0.5rem',
    backgroundColor: 'rgb(17, 24, 39)',
    border: '1px solid rgb(55, 65, 81)',
    borderRadius: '0.375rem',
    color: 'rgb(243, 244, 246)',
    fontSize: '0.875rem',
  },
  exportActions: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'flex-end',
  },
  exportConfirmButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: 'rgb(59, 130, 246)',
    color: 'white',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontWeight: '600',
    border: 'none',
  },
  exportCancelButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: 'rgb(55, 65, 81)',
    color: 'rgb(243, 244, 246)',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontWeight: '600',
    border: 'none',
  },
  statusFilterSection: {
    marginBottom: '1.5rem',
  },
  statusFilterLabel: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: 'rgb(243, 244, 246)',
    marginBottom: '0.75rem',
    display: 'block',
  },
  checkboxGroup: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    color: 'rgb(243, 244, 246)',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },
  checkboxText: {
    fontSize: '0.875rem',
  },
};

export default AdminDashboard;
