import React, { useState, useEffect } from 'react';

const AuthenticatedImage = ({ src, alt, style, onClick, onError }) => {
  const [blobUrl, setBlobUrl] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchImage = async () => {
      try {
        const token = localStorage.getItem('admin_token');
        const response = await fetch(src, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (!response.ok) throw new Error('Failed to load');
        const blob = await response.blob();
        setBlobUrl(URL.createObjectURL(blob));
      } catch (e) {
        setError(true);
        onError?.();
      }
    };
    fetchImage();
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [src]);

  if (error) return null;
  if (!blobUrl) return <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgb(156, 163, 175)' }}>Loading...</div>;
  return <img src={blobUrl} alt={alt} style={style} onClick={onClick} />;
};

const PhotoGallery = ({ photoPaths, title = "Photos", editable = false, onDelete }) => {
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [imageErrors, setImageErrors] = useState({});

  if (!photoPaths) return null;

  const paths = photoPaths.split(',').filter(p => p.trim());
  if (paths.length === 0) return null;

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const handleDeleteClick = (path, index) => {
    setDeleteConfirm({ path, index });
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirm && onDelete && !deleting) {
      setDeleting(true);
      setDeleteConfirm(null);
      try {
        await onDelete(deleteConfirm.path);
      } catch (err) {
        console.error('Delete failed:', err);
      } finally {
        setDeleting(false);
      }
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirm(null);
  };

  const handleImageError = (index) => {
    setImageErrors(prev => ({ ...prev, [index]: true }));
  };

  const openPdfWithAuth = async (fileUrl) => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(fileUrl, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!response.ok) throw new Error('Failed to load PDF');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch (e) {
      console.error('Failed to open PDF:', e);
    }
  };

  const downloadFile = async (fileUrl, filename) => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(fileUrl, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!response.ok) throw new Error('Failed to download');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error('Failed to download file:', e);
    }
  };

  return (
    <>
      {title && <h3 style={styles.title}>{title}</h3>}
      {paths.map((path, index) => {
          const trimmedPath = path.trim();
          const fileUrl = `${apiUrl}/api/admin/files/${trimmedPath}`;
          const isPDF = trimmedPath.toLowerCase().endsWith('.pdf');

          return (
            <div
              key={trimmedPath}
              style={styles.imageWrapper}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {isPDF ? (
                <div
                  style={styles.pdfPreview}
                  onClick={() => openPdfWithAuth(fileUrl)}
                >
                  <div style={styles.pdfIcon}>📄</div>
                  <div style={styles.pdfText}>PDF Document</div>
                  <div style={styles.pdfFilename}>{trimmedPath.split('/').pop()}</div>
                </div>
              ) : imageErrors[index] ? (
                <div style={styles.errorMessage}>
                  Failed to load image
                </div>
              ) : (
                <AuthenticatedImage
                  src={fileUrl}
                  alt={`${title} ${index + 1}`}
                  style={styles.image}
                  onClick={() => setLightboxImage(fileUrl)}
                  onError={() => handleImageError(index)}
                />
              )}
              {hoveredIndex === index && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadFile(fileUrl, trimmedPath.split('/').pop());
                  }}
                  style={styles.downloadButton}
                  title="Download"
                >
                  ↓
                </button>
              )}
              {editable && hoveredIndex === index && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(trimmedPath, index);
                  }}
                  style={styles.deleteButton}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}

      {/* Lightbox */}
      {lightboxImage && (
        <div style={styles.lightbox} onClick={() => setLightboxImage(null)}>
          <div style={styles.lightboxContent}>
            <button
              onClick={() => setLightboxImage(null)}
              style={styles.lightboxClose}
            >
              ×
            </button>
            <AuthenticatedImage
              src={lightboxImage}
              alt="Full size"
              style={styles.lightboxImage}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Delete Photo</h3>
            <p style={styles.modalText}>Are you sure you want to delete this photo?</p>
            <div style={styles.modalActions}>
              <button onClick={handleConfirmDelete} style={styles.modalDeleteButton}>
                Delete
              </button>
              <button onClick={handleCancelDelete} style={styles.modalCancelButton}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const styles = {
  container: {
    width: '100%',
  },
  title: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: 'rgb(243, 244, 246)',
    marginBottom: '1rem',
  },
  gallery: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '1rem',
  },
  imageWrapper: {
    border: '1px solid rgb(55, 65, 81)',
    borderRadius: '0.375rem',
    overflow: 'hidden',
    backgroundColor: 'rgb(17, 24, 39)',
    aspectRatio: '4 / 3',
    position: 'relative',
  },
  pdfPreview: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    backgroundColor: 'rgb(17, 24, 39)',
    border: '2px dashed rgb(255, 173, 179)',
    borderRadius: '0.375rem',
    padding: '1rem',
    transition: 'all 0.2s',
  },
  pdfIcon: {
    fontSize: '4rem',
    lineHeight: '1',
    marginBottom: '0.5rem',
  },
  pdfText: {
    fontSize: '0.875rem',
    color: 'rgb(255, 173, 179)',
    fontWeight: '600',
    marginBottom: '0.5rem',
  },
  pdfFilename: {
    fontSize: '0.75rem',
    color: 'rgb(156, 163, 175)',
    textAlign: 'center',
    wordBreak: 'break-word',
    maxWidth: '100%',
  },
  deleteButton: {
    position: 'absolute',
    top: '0.5rem',
    right: '0.5rem',
    width: '2rem',
    height: '2rem',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 173, 179, 0.95)',
    color: 'rgb(17, 24, 39)',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: '1',
    fontWeight: '600',
    transition: 'all 0.2s',
  },
  downloadButton: {
    position: 'absolute',
    bottom: '0.5rem',
    right: '0.5rem',
    width: '2rem',
    height: '2rem',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 173, 179, 0.95)',
    color: 'rgb(17, 24, 39)',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.25rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: '1',
    fontWeight: '600',
    transition: 'all 0.2s',
  },
  lightbox: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    cursor: 'zoom-out',
  },
  lightboxContent: {
    position: 'relative',
    maxWidth: '95vw',
    maxHeight: '95vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxImage: {
    maxWidth: '100%',
    maxHeight: '95vh',
    objectFit: 'contain',
    cursor: 'default',
  },
  lightboxClose: {
    position: 'absolute',
    top: '-3rem',
    right: '0',
    width: '3rem',
    height: '3rem',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 173, 179, 0.95)',
    color: 'rgb(17, 24, 39)',
    border: 'none',
    cursor: 'pointer',
    fontSize: '2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: '1',
    fontWeight: '600',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    cursor: 'pointer',
  },
  errorMessage: {
    display: 'flex',
    padding: '1rem',
    textAlign: 'center',
    color: 'rgb(156, 163, 175)',
    fontSize: '0.875rem',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
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

export default PhotoGallery;
