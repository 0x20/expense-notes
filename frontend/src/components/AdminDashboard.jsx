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

    if (filteredExpenses.length === 0) {
      alert('No expenses found in the selected date range with selected statuses');
      return;
    }

    try {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const margin = 40;
      const lineHeight = 12;
      const gray = rgb(0.4, 0.4, 0.4);
      const black = rgb(0, 0, 0);

      // Helper: wrap text to fit width
      const wrapText = (text, maxWidth, fontSize) => {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const testWidth = font.widthOfTextAtSize(testLine, fontSize);
          if (testWidth > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) lines.push(currentLine);
        return lines;
      };

      // Helper: draw page footer
      const drawFooter = (page, expenseIndex, totalExpenses, memberName) => {
        const { width } = page.getSize();
        page.drawText(`Expense ${expenseIndex + 1}/${totalExpenses} — ${memberName}`, {
          x: margin,
          y: 20,
          size: 8,
          font,
          color: gray,
        });
        page.drawText(format(new Date(), 'yyyy-MM-dd'), {
          x: width - margin - 60,
          y: 20,
          size: 8,
          font,
          color: gray,
        });
      };

      // Calculate totals for cover page
      const totalAmount = filteredExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
      const statusCounts = filteredExpenses.reduce((acc, e) => {
        acc[e.status] = (acc[e.status] || 0) + 1;
        return acc;
      }, {});

      // Cover page
      let page = pdfDoc.addPage();
      let { width, height } = page.getSize();
      let yPos = height - 80;

      page.drawText('Expense Report', { x: margin, y: yPos, size: 24, font: fontBold });
      yPos -= 30;

      page.drawText(`${format(startDate, 'yyyy/MM/dd')} — ${format(endDate, 'yyyy/MM/dd')}`, {
        x: margin, y: yPos, size: 12, font, color: gray
      });
      yPos -= 40;

      // Summary box
      page.drawRectangle({
        x: margin,
        y: yPos - 80,
        width: width - 2 * margin,
        height: 90,
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 1,
      });

      page.drawText('Summary', { x: margin + 10, y: yPos - 5, size: 11, font: fontBold });
      yPos -= 25;
      page.drawText(`Total Expenses: ${filteredExpenses.length}`, { x: margin + 10, y: yPos, size: 10, font });
      yPos -= 15;
      page.drawText(`Total Amount: €${totalAmount.toFixed(2)}`, { x: margin + 10, y: yPos, size: 10, font: fontBold });
      yPos -= 15;
      const statusText = Object.entries(statusCounts).map(([s, c]) => `${s}: ${c}`).join('  |  ');
      page.drawText(`Status: ${statusText}`, { x: margin + 10, y: yPos, size: 10, font });
      yPos -= 50;

      // Table of contents
      page.drawText('Contents', { x: margin, y: yPos, size: 11, font: fontBold });
      yPos -= 18;

      for (let i = 0; i < filteredExpenses.length; i++) {
        const e = filteredExpenses[i];
        if (yPos < 50) {
          page = pdfDoc.addPage();
          yPos = height - margin;
        }
        const tocLine = `${i + 1}. ${e.member_name} — €${parseFloat(e.amount).toFixed(2)} — ${e.status}`;
        page.drawText(tocLine, { x: margin + 10, y: yPos, size: 9, font });
        yPos -= 14;
      }

      // Each expense
      for (let i = 0; i < filteredExpenses.length; i++) {
        const expense = filteredExpenses[i];
        page = pdfDoc.addPage();
        ({ width, height } = page.getSize());
        yPos = height - margin;
        const contentWidth = width - 2 * margin;

        // Header line
        page.drawLine({
          start: { x: margin, y: yPos },
          end: { x: width - margin, y: yPos },
          thickness: 2,
          color: rgb(0.2, 0.2, 0.2),
        });
        yPos -= 20;

        // Title row: name + amount
        page.drawText(expense.member_name, { x: margin, y: yPos, size: 14, font: fontBold });
        const amountText = `€${parseFloat(expense.amount).toFixed(2)}`;
        const amountWidth = fontBold.widthOfTextAtSize(amountText, 14);
        page.drawText(amountText, { x: width - margin - amountWidth, y: yPos, size: 14, font: fontBold });
        yPos -= 16;

        // Subtitle row: email + date
        page.drawText(expense.member_email, { x: margin, y: yPos, size: 9, font, color: gray });
        const dateText = format(new Date(expense.date_entered), 'yyyy/MM/dd');
        const dateWidth = font.widthOfTextAtSize(dateText, 9);
        page.drawText(dateText, { x: width - margin - dateWidth, y: yPos, size: 9, font, color: gray });
        yPos -= 20;

        // Description with wrapping
        const descLines = wrapText(expense.description || '', contentWidth, 10);
        for (const line of descLines) {
          page.drawText(line, { x: margin, y: yPos, size: 10, font });
          yPos -= lineHeight;
        }
        yPos -= 10;

        // Status badge
        const statusColors = {
          pending: rgb(0.9, 0.7, 0.1),
          paid: rgb(0.2, 0.7, 0.3),
          denied: rgb(0.8, 0.2, 0.2),
        };
        const statusColor = statusColors[expense.status] || black;
        page.drawText(expense.status.toUpperCase(), { x: margin, y: yPos, size: 10, font: fontBold, color: statusColor });
        yPos -= 18;

        // Admin details (condensed, two-column where possible)
        if (expense.status !== 'pending') {
          const adminFields = [];
          if (expense.pay_date) adminFields.push(['Pay Date', format(new Date(expense.pay_date), 'yyyy/MM/dd')]);
          if (expense.paid_from) adminFields.push(['From', expense.paid_from]);
          if (expense.paid_to) adminFields.push(['To', expense.paid_to]);
          if (expense.financial_responsible) adminFields.push(['Responsible', expense.financial_responsible]);

          // Two-column layout for admin fields
          const colWidth = contentWidth / 2;
          for (let j = 0; j < adminFields.length; j += 2) {
            const [label1, value1] = adminFields[j];
            page.drawText(`${label1}: `, { x: margin, y: yPos, size: 9, font: fontBold, color: gray });
            page.drawText(value1, { x: margin + font.widthOfTextAtSize(`${label1}: `, 9), y: yPos, size: 9, font });

            if (adminFields[j + 1]) {
              const [label2, value2] = adminFields[j + 1];
              page.drawText(`${label2}: `, { x: margin + colWidth, y: yPos, size: 9, font: fontBold, color: gray });
              page.drawText(value2, { x: margin + colWidth + font.widthOfTextAtSize(`${label2}: `, 9), y: yPos, size: 9, font });
            }
            yPos -= lineHeight;
          }

          // Admin notes (full width, wrapped)
          if (expense.admin_notes) {
            yPos -= 5;
            page.drawText('Notes: ', { x: margin, y: yPos, size: 9, font: fontBold, color: gray });
            const notesLines = wrapText(expense.admin_notes, contentWidth - 40, 9);
            const notesLabelWidth = font.widthOfTextAtSize('Notes: ', 9);
            page.drawText(notesLines[0] || '', { x: margin + notesLabelWidth, y: yPos, size: 9, font });
            yPos -= lineHeight;
            for (let k = 1; k < notesLines.length; k++) {
              page.drawText(notesLines[k], { x: margin + notesLabelWidth, y: yPos, size: 9, font });
              yPos -= lineHeight;
            }
          }
        }
        yPos -= 10;

        // Attachments section
        const allFiles = [expense.photo_paths, expense.attachment_paths]
          .filter(Boolean)
          .join(',')
          .split(',')
          .filter(p => p.trim());

        if (allFiles.length > 0) {
          page.drawLine({
            start: { x: margin, y: yPos },
            end: { x: width - margin, y: yPos },
            thickness: 0.5,
            color: rgb(0.8, 0.8, 0.8),
          });
          yPos -= 15;
          page.drawText('Attachments', { x: margin, y: yPos, size: 10, font: fontBold });
          yPos -= 15;

          for (const filePath of allFiles) {
            const trimmedPath = filePath.trim();
            const fileName = trimmedPath.split('/').pop();
            const isPDF = trimmedPath.toLowerCase().endsWith('.pdf');
            const fileUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/admin/files/${trimmedPath}`;

            if (isPDF) {
              const pdfBytes = await loadFileAsArrayBuffer(fileUrl);
              if (pdfBytes) {
                try {
                  const attachedPdf = await PDFDocument.load(pdfBytes);
                  const copiedPages = await pdfDoc.copyPages(attachedPdf, attachedPdf.getPageIndices());

                  // Note on current page about the PDF
                  page.drawText(`📄 ${fileName} (${copiedPages.length} page${copiedPages.length > 1 ? 's' : ''} follow)`, {
                    x: margin + 5, y: yPos, size: 9, font, color: gray
                  });
                  yPos -= lineHeight;

                  // Add the PDF pages with a header on each
                  copiedPages.forEach((copiedPage, pageIdx) => {
                    pdfDoc.addPage(copiedPage);
                  });
                } catch (pdfError) {
                  console.error('Failed to merge PDF:', pdfError);
                  page.drawText(`📄 ${fileName} (merge failed)`, { x: margin + 5, y: yPos, size: 9, font, color: rgb(0.8, 0.2, 0.2) });
                  yPos -= lineHeight;
                }
              }
            } else {
              // Image
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
                  const maxWidth = contentWidth;
                  const maxHeight = 350;

                  let imgWidth = Math.min(imgDims.width, maxWidth);
                  let imgHeight = imgWidth * (imgDims.height / imgDims.width);
                  if (imgHeight > maxHeight) {
                    imgHeight = maxHeight;
                    imgWidth = imgHeight / (imgDims.height / imgDims.width);
                  }

                  // New page if needed
                  if (yPos - imgHeight < margin + 30) {
                    drawFooter(page, i, filteredExpenses.length, expense.member_name);
                    page = pdfDoc.addPage();
                    ({ width, height } = page.getSize());
                    yPos = height - margin;
                  }

                  page.drawImage(image, {
                    x: margin,
                    y: yPos - imgHeight,
                    width: imgWidth,
                    height: imgHeight,
                  });
                  yPos -= imgHeight + 10;
                } catch (imgError) {
                  console.error('Failed to embed image:', imgError);
                  page.drawText(`🖼 ${fileName} (embed failed)`, { x: margin + 5, y: yPos, size: 9, font, color: rgb(0.8, 0.2, 0.2) });
                  yPos -= lineHeight;
                }
              }
            }
          }
        }

        drawFooter(page, i, filteredExpenses.length, expense.member_name);
      }

      // Save and download
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
